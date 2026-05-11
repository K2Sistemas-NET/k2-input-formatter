/**
 * @license MIT
 * @version 1.0.3
 * Copyright (c) 2026 K2Sistemas.NET
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * ---------------------------------------------------------------------------
 *
 * Por la presente se concede permiso, de forma gratuita, a cualquier persona
 * que obtenga una copia de este software y los archivos de documentación
 * asociados (el "Software"), para utilizar el Software sin restricciones,
 * incluyendo, sin limitación, los derechos de usar, copiar, modificar, fusionar,
 * publicar, distribuir, sublicenciar y/o vender copias del Software, y permitir
 * a las personas a quienes se les proporcione el Software que lo hagan, sujeto
 * a las siguientes condiciones:
 *
 * El aviso de copyright anterior y este aviso de permiso se incluirán en todas
 * las copias o partes sustanciales del Software.
 *
 * EL SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTÍA DE NINGÚN TIPO, EXPRESA
 * O IMPLÍCITA, INCLUYENDO PERO NO LIMITADO A LAS GARANTÍAS DE COMERCIABILIDAD,
 * IDONEIDAD PARA UN PROPÓSITO PARTICULAR Y NO INFRACCIÓN. EN NINGÚN CASO LOS
 * AUTORES O TITULARES DEL COPYRIGHT SERÁN RESPONSABLES DE NINGUNA RECLAMACIÓN,
 * DAÑO U OTRA RESPONSABILIDAD, YA SEA EN UNA ACCIÓN CONTRACTUAL, AGRAVIO O DE
 * OTRO MODO, QUE SURJA DE, FUERA DE O EN CONEXIÓN CON EL SOFTWARE O EL USO U
 * OTROS TRATOS EN EL SOFTWARE.
 *
 * Nota: La versión en inglés es la versión oficial y legalmente vinculante.
 */

// =============================================================================
// SECCIÓN 1: HISTORIAL DE DESHACER/REHACER PARA CAMPOS NUMÉRICOS
// Utiliza WeakMap para asociar el historial a cada elemento <input> sin
// impedir que el garbage collector lo limpie cuando el elemento se destruye.
// =============================================================================

const K2HistoricoNumeros = new WeakMap();
const K2HistoricoFecha = new WeakMap();

/**
 * Obtiene (o inicializa) el historial de deshacer/rehacer para un campo numérico.
 * @param {HTMLInputElement} input - El campo de entrada.
 * @returns {{ deshacer: Array, rehacer: Array }}
 */
function K2GetHistoricoNumeros(input) {
    if (!K2HistoricoNumeros.has(input)) {
        K2HistoricoNumeros.set(input, {
            deshacer: [],
            rehacer: []
        });
    }
    return K2HistoricoNumeros.get(input);
}

/**
 * Guarda el estado actual del campo numérico en la pila de deshacer.
 * Limita el historial a 10 entradas y limpia la pila de rehacer.
 * @param {HTMLInputElement} input - El campo de entrada.
 */
function K2GuardarEstadoNumeros(input) {
    const historial = K2GetHistoricoNumeros(input);
    historial.deshacer.push({
        valor: input.value,
        pos: input.selectionStart,
        posFin: input.selectionEnd
    });
    if (historial.deshacer.length > 10) historial.deshacer.shift();
    historial.rehacer = [];
}

// =============================================================================
// SECCIÓN 2: HISTORIAL DE DESHACER/REHACER PARA CAMPOS DE FECHA
// Mismo patrón que la sección anterior, pero para campos de fecha/hora.
// =============================================================================

/**
 * Obtiene (o inicializa) el historial de deshacer/rehacer para un campo de fecha.
 * @param {HTMLInputElement} input - El campo de entrada.
 * @returns {{ deshacer: Array, rehacer: Array }}
 */
function K2GetHistoricoFecha(input) {
    if (!K2HistoricoFecha.has(input)) {
        K2HistoricoFecha.set(input, {
            deshacer: [],
            rehacer: []
        });
    }
    return K2HistoricoFecha.get(input);
}

/**
 * Guarda el estado actual del campo de fecha en la pila de deshacer.
 * Limita el historial a 10 entradas y limpia la pila de rehacer.
 * @param {HTMLInputElement} input - El campo de entrada.
 */
function K2GuardarEstadoFecha(input) {
    const historial = K2GetHistoricoFecha(input);
    historial.deshacer.push({
        valor: input.value,
        pos: input.selectionStart,
        posFin: input.selectionEnd
    });
    if (historial.deshacer.length > 10) historial.deshacer.shift();
    historial.rehacer = [];
}

// =============================================================================
// SECCIÓN 3: MANEJO DE TECLADO PARA CAMPOS NUMÉRICOS (K2NumerosKeyDown)
// Controla qué teclas están permitidas, aplica formato de miles con punto
// y decimales con coma, y gestiona corte (Ctrl+X), pegado (Shift+Insert),
// deshacer (Ctrl+Z) y rehacer (Ctrl+Y / Ctrl+Shift+Z).
// =============================================================================

/**
 * Manejador del evento keydown para campos numéricos con formato.
 * Formato esperado: separador de miles = punto (.), separador decimal = coma (,)
 * @param {KeyboardEvent} event  - Evento de teclado.
 * @param {HTMLInputElement} input - El campo de entrada.
 * @param {number} decimales - Cantidad máxima de decimales permitidos.
 * @param {string} salto  - ID del elemento al que saltar al confirmar con Enter.
 * @returns {boolean}
 */
function K2NumerosKeyDown(event, input, decimales, salto) {

    // --- Bloque: Cortar (Ctrl+X / Shift+Delete) ---
    // Permite cortar la selección y reformatea el número restante manteniendo
    // la posición del cursor ajustada a los puntos de miles eliminados.
    if (((event.ctrlKey || event.metaKey) && (event.key === 'x' || event.key === 'X')) ||
        (event.shiftKey && event.key === 'Delete')) {
        const posCorte = input.selectionStart;
        const posCorteLogica = posCorte - (input.value.substring(0, posCorte).match(/\./g) || []).length;
        setTimeout(function () {
            let valorConTecla = input.value.replace(/\./g, '').replace(/[^0-9,]/g, '');
            const partes = valorConTecla.split(',');
            partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            input.value = partes.join(',');
            let i = 0, logico = 0;
            while (i < input.value.length && logico < posCorteLogica) {
                if (input.value[i] !== '.') logico++;
                i++;
            }
            input.setSelectionRange(i, i);
        }, 0);
        return true;
    }

    // --- Bloque: Pegar con Shift+Insert ---
    // Simula un evento de pegado leyendo del portapapeles y delegando a K2NumerosPaste.
    if (event.shiftKey && event.key === 'Insert') {
        navigator.clipboard.readText().then(function (textoPegado) {
            K2NumerosPaste({
                preventDefault: () => { },
                clipboardData: { getData: () => textoPegado }
            }, input, decimales);
        });
        event.preventDefault();
        return true;
    }

    // --- Bloque: Filtro de teclas permitidas ---
    // Solo se permiten dígitos, coma/punto (decimal), teclas de navegación,
    // borrado y combinaciones con Ctrl/Meta. Cualquier otra tecla se bloquea.
    const teclaPermitida =
        event.key === 'Backspace' || event.key === 'Delete' ||
        event.key === 'Tab' || event.key === 'Enter' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'Home' || event.key === 'End' ||
        event.ctrlKey || event.metaKey ||
        /^[0-9]$/.test(event.key) ||
        event.key === ',' || event.key === '.';

    if (!teclaPermitida) {
        event.preventDefault();
        return false;
    }

    // --- Bloque: Clasificación de la tecla presionada ---
    const esDigito = /^[0-9]$/.test(event.key);
    const esComa  = event.key === ',' || event.key === '.'; // Tanto ',' como '.' se tratan como separador decimal
    const esBorrar = event.key === 'Backspace';
    const esDel    = event.key === 'Delete';
    const esEnter  = event.key === 'Enter';

    const pos        = input.selectionStart;
    const posFin     = input.selectionEnd;
    const valorActual = input.value;

    // --- Bloque: Enter sin decimales al inicio ---
    // Si el valor empieza por coma (ej: ",5") al presionar Enter se antepone "0".
    if (esEnter) {
        event.preventDefault();
        if (valorActual.startsWith(',')) {
            const valorConCero = '0' + valorActual;
            const partes = valorConCero.replace(/\./g, '').split(',');
            partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            input.value = partes.join(',');
            input.setSelectionRange(posFin, posFin);
        }
        if (salto) {
            const fi = document.getElementById(salto);
            if (fi) fi.focus();
        }
        return false;
    }

    // --- Bloque: Deshacer (Ctrl+Z) ---
    const esDeshacer = (event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'z' || event.key === 'Z');
    // --- Bloque: Rehacer (Ctrl+Y o Ctrl+Shift+Z) ---
    const esRehacer  = ((event.ctrlKey || event.metaKey) && (event.key === 'y' || event.key === 'Y')) ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'z' || event.key === 'Z'));

    if (esDeshacer) {
        const historial = K2GetHistoricoNumeros(input);
        if (historial.deshacer.length > 0) {
            historial.rehacer.push({ valor: input.value, pos: input.selectionStart, posFin: input.selectionEnd });
            const estado = historial.deshacer.pop();
            input.value = estado.valor;
            input.setSelectionRange(estado.pos, estado.posFin);
        }
        event.preventDefault();
        return false;
    }

    if (esRehacer) {
        const historial = K2GetHistoricoNumeros(input);
        if (historial.rehacer.length > 0) {
            historial.deshacer.push({ valor: input.value, pos: input.selectionStart, posFin: input.selectionEnd });
            const estado = historial.rehacer.pop();
            input.value = estado.valor;
            input.setSelectionRange(estado.pos, estado.posFin);
        }
        event.preventDefault();
        return false;
    }

    // Si no es una tecla de edición relevante, se deja pasar sin más procesamiento.
    if (!esDigito && !esComa && !esBorrar && !esDel) return;

    // Guarda estado antes de modificar el valor (para deshacer).
    K2GuardarEstadoNumeros(input);

    event.preventDefault();

    // --- Bloque: Límite máximo de dígitos ---
    // Si maxLength no está definido o es 0/-1, se usa 8 como valor por defecto.
    let max = input.maxLength;
    if (max <= 0) max = 8;

    // --- Bloque: Control de coma duplicada ---
    // Impide ingresar una segunda coma salvo que la existente esté seleccionada.
    if (esComa && valorActual.includes(',')) {
        const posIComa = valorActual.indexOf(',');
        const comaSeleccionada = posIComa >= pos && posIComa < posFin;
        if (!comaSeleccionada) return false;
    }

    // --- Bloque: Verificación de límite de dígitos ---
    // No permite agregar más dígitos si ya se alcanzó el máximo.
    const digitosActuales    = input.value.replace(/[.,]/g, '').length;
    const digitosSeleccionados = input.value.slice(pos, posFin).replace(/[.,]/g, '').length;
    if ((esDigito || esComa) && (digitosActuales - digitosSeleccionados) >= max) {
        return false;
    }

    // --- Bloque: Saltar separador de miles con Backspace/Delete ---
    // En lugar de borrar el punto de miles, simplemente mueve el cursor.
    if (esBorrar && pos > 0 && valorActual[pos - 1] === '.') {
        input.setSelectionRange(pos - 1, pos - 1);
        return false;
    }
    if (esDel && valorActual[pos] === '.') {
        input.setSelectionRange(pos + 1, pos + 1);
        return false;
    }

    // --- Bloque: Construcción del nuevo valor ---
    // Normaliza '.' a ',' como separador decimal y aplica la tecla al valor actual.
    const tecla = esComa ? ',' : event.key;

    let valorConTecla =
        esDigito || esComa ? valorActual.slice(0, pos) + tecla + valorActual.slice(posFin)
            : esBorrar ? (pos !== posFin ? valorActual.slice(0, pos) + valorActual.slice(posFin)
                : valorActual.slice(0, Math.max(0, pos - 1)) + valorActual.slice(pos))
                : esDel ? (pos !== posFin ? valorActual.slice(0, pos) + valorActual.slice(posFin)
                    : valorActual.slice(0, pos) + valorActual.slice(pos + 1))
                    : valorActual;

    // --- Bloque: Cálculo de la nueva posición del cursor (sin contar puntos de miles) ---
    let pos2 = esDigito || esComa ? pos + 1
        : esBorrar ? (pos !== posFin ? pos : pos - 1)
            : pos;

    let pos2SinPuntos = valorConTecla.substring(0, pos2).replace(/\./g, '').length;

    // Elimina puntos de miles y caracteres no válidos del valor en bruto.
    valorConTecla = valorConTecla.replace(/\./g, '');
    valorConTecla = valorConTecla.replace(/[^0-9,]/g, '');

    // --- Bloque: Prefijo "0" cuando el valor empieza por coma ---
    // Ej: si el usuario escribe ",5" se convierte a "0,5".
    if (valorConTecla.startsWith(',')) {
        if (esBorrar || esDel) {
            if (valorConTecla === ',') {
                valorConTecla = ''; // Si solo queda la coma, se borra todo.
            }
        } else {
            valorConTecla = '0' + valorConTecla;
            pos2SinPuntos += 1;
        }
    }

    // --- Bloque: Recorte de decimales según el parámetro `decimales` ---
    // Si decimales === 0 se elimina todo lo que haya tras la coma.
    // Si decimales > 0 se trunca la parte decimal al número indicado.
    if (decimales === 0) {
        valorConTecla = valorConTecla.replace(/,.*/g, '');
    } else {
        const idx = valorConTecla.indexOf(',');
        if (idx !== -1) {
            const entero = valorConTecla.substring(0, idx + 1);
            let decimales2 = valorConTecla.substring(idx + 1).replace(/,/g, '');
            decimales2 = decimales2.substring(0, decimales);
            valorConTecla = entero + decimales2;
        }
    }

    // --- Bloque: Formateo final con separador de miles ---
    // Divide por coma, aplica puntos de miles a la parte entera y vuelve a unir.
    const partes = valorConTecla.split(',');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = partes.join(',');

    // --- Bloque: Reposicionamiento del cursor ---
    // Recorre el valor formateado contando solo caracteres lógicos (sin puntos)
    // hasta llegar a la posición calculada.
    let i = 0, logico = 0;
    for (; i < input.value.length; i++) {
        if (logico >= pos2SinPuntos) break;
        if (input.value[i] !== '.') logico++;
    }
    input.setSelectionRange(i, i);

    return false;
}

// =============================================================================
// SECCIÓN 4: MANEJO DE PEGADO PARA CAMPOS NUMÉRICOS (K2NumerosPaste)
// Normaliza el texto pegado (acepta punto o coma como decimal), aplica el
// límite de dígitos y reformatea con separador de miles.
// =============================================================================

/**
 * Manejador del evento paste para campos numéricos con formato.
 * @param {ClipboardEvent} event   - Evento de pegado.
 * @param {HTMLInputElement} input - El campo de entrada.
 * @param {number} decimales       - Cantidad máxima de decimales permitidos.
 */
function K2NumerosPaste(event, input, decimales) {

    if (input.disabled || input.readOnly) return false;

    event.preventDefault();

    K2GuardarEstadoNumeros(input);

    const pos      = input.selectionStart;
    const posFin   = input.selectionEnd;
    const inputLength = input.value.length;

    let textoPegado = (event.clipboardData || window.clipboardData).getData('text');

    // Si maxLength no está definido o es 0/-1, se usa 8 como valor por defecto.
    let max = input.maxLength;
    if (max <= 0) max = 8;

    // --- Bloque: Cálculo de posiciones reales (sin contar puntos de miles) ---
    const valorSinPuntos       = input.value.replace(/\./g, '');
    const puntosAntesCursor    = (input.value.substring(0, pos).match(/\./g) || []).length;
    const puntosAntesPosFin    = (input.value.substring(0, posFin).match(/\./g) || []).length;
    const posReal              = pos - puntosAntesCursor;
    const posFinReal           = posFin - puntosAntesPosFin;

    // --- Bloque: Validación de coma duplicada ---
    // Si tanto el campo como el texto pegado tienen coma, solo se permite
    // pegar si la coma del campo está dentro de la selección.
    const tieneIComa = input.value.includes(',');
    const tienePComa = textoPegado.includes(',');

    if (tieneIComa && tienePComa) {
        const posIComa = input.value.indexOf(',');
        const comaSeleccionada = posIComa >= pos && posIComa < posFin;
        if (!comaSeleccionada) return;
    }

    // --- Bloque: Validación de formato del texto pegado con coma ---
    // Si el texto pegado tiene coma, debe tener la forma "dígitos,dígitos".
    if (tienePComa) {
        const formatoValido = /\d+,\d+/.test(textoPegado);
        if (!formatoValido) return;
    }

    // Guarda el número de decimales antes del pegado para ajustar cursor después.
    const decimalesAntes = input.value.includes(',')
        ? input.value.split(',')[1]?.length ?? 0
        : 0;

    // --- Bloque: Combinación del valor existente con el texto pegado ---
    const valorCombinado = valorSinPuntos.slice(0, posReal) + textoPegado + valorSinPuntos.slice(posFinReal);

    // --- Bloque: Detección de separadores en el texto pegado ---
    const posComa0  = input.value.indexOf(',');
    const posPunto  = valorCombinado.indexOf('.');
    const posComa   = valorCombinado.indexOf(',');
    const tienePunto = posPunto !== -1;
    const tieneComa  = posComa  !== -1;

    let anadePos = 0;

    // --- Bloque: Normalización del separador decimal ---
    // Si hay punto y coma: el que aparezca primero es el separador de miles y
    // el segundo es el decimal. Si solo hay punto, se convierte a coma.
    let texto = valorCombinado;
    if (tienePunto && tieneComa) {
        if (posPunto < posComa) {
            texto = texto.replace(/\./g, '');          // Punto = miles → se elimina
        } else {
            texto = texto.replace(/,/g, '');           // Coma = miles → se elimina
            texto = texto.replace('.', ',');           // Punto = decimal → pasa a coma
        }
    } else if (tienePunto && !tieneComa) {
        texto = texto.replace('.', ',');               // Punto único → separador decimal
    }
    texto = texto.replace(/[^0-9,]/g, '');

    // --- Bloque: Prefijo "0" si el valor empieza por coma y el campo estaba vacío ---
    let valorCrudo = texto;
    if (valorCrudo.startsWith(',') && inputLength === 0) {
        anadePos += 1;
        valorCrudo = '0' + valorCrudo;
    }

    // --- Bloque: Recorte de decimales según el parámetro `decimales` ---
    if (decimales === 0) {
        valorCrudo = valorCrudo.replace(/,.*/g, '');
    } else {
        const idx = valorCrudo.indexOf(',');
        if (idx !== -1) {
            const entero = valorCrudo.substring(0, idx + 1);
            let decimales2 = valorCrudo.substring(idx + 1).replace(/,/g, '').substring(0, decimales);
            valorCrudo = entero + decimales2;
        }
    }

    // --- Bloque: Recorte por exceso de dígitos totales (primera pasada) ---
    // Si supera el máximo, recorta decimales primero.
    const soloDigitos = valorCrudo.replace(/[.,]/g, '');
    const idxComa = valorCrudo.indexOf(',');
    if (soloDigitos.length > max && idxComa !== -1) {
        const entero  = valorCrudo.substring(0, idxComa);
        let decimal   = valorCrudo.substring(idxComa + 1);
        const exceso  = soloDigitos.length - max;
        decimal = decimal.substring(0, Math.max(0, decimal.length - exceso));
        valorCrudo = decimal.length > 0 ? entero + ',' + decimal : entero;
    }

    // --- Bloque: Recorte por exceso de dígitos totales (segunda pasada) ---
    // Si aún supera el máximo (sin parte decimal), recorta la parte entera.
    const soloDigitos2 = valorCrudo.replace(/[.,]/g, '');
    if (soloDigitos2.length > max) {
        const idxComa2 = valorCrudo.indexOf(',');
        if (idxComa2 !== -1) {
            const decimal         = valorCrudo.substring(idxComa2 + 1);
            const enteroRecortado = valorCrudo.substring(0, idxComa2).substring(soloDigitos2.length - max - decimal.length);
            valorCrudo = enteroRecortado + ',' + decimal;
        } else {
            valorCrudo = soloDigitos2.substring(soloDigitos2.length - max);
        }
    }

    // --- Bloque: Formateo final con separador de miles ---
    const partesF = valorCrudo.split(',');
    partesF[0] = partesF[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const valorFinal = partesF.join(',');

    // --- Bloque: Ajuste del cursor tras el pegado ---
    // Calcula cuántos caracteres se añadieron/eliminaron en la parte decimal
    // para colocar el cursor en la posición correcta.
    const decimalesDespues = valorFinal.includes(',')
        ? valorFinal.split(',')[1]?.length ?? 0
        : 0;

    const decimalesPerdidos      = decimalesDespues - decimalesAntes;
    const cursorEstaEnDecimales  = (posFin - 1) >= posComa0;
    if (cursorEstaEnDecimales && decimalesAntes) {
        anadePos += textoPegado.replace(/[.,]/g, '').length;
        anadePos -= decimalesDespues - decimalesAntes;
    } else {
        if (decimalesDespues > decimalesAntes) {
            anadePos += decimalesPerdidos;
        } else {
            anadePos -= decimalesPerdidos;
            if (decimalesDespues === 0 && decimalesAntes !== 0) anadePos += 1;
        }
    }

    const pos1    = inputLength - posFin;
    const posFinal = valorFinal.length - pos1 + anadePos;

    input.value = valorFinal;

    input.setSelectionRange(posFinal, posFinal);
}

// =============================================================================
// SECCIÓN 5: VALIDACIÓN DE FECHA/HORA (K2ValidarFecha2)
// Recibe una cadena parcial o completa con formato dd/mm/yyyy hh:mm:ss,
// la completa con valores por defecto (fecha de hoy / 00:00:00) y verifica
// que los componentes correspondan a una fecha y hora reales.
// =============================================================================

/**
 * Valida y parsea una cadena de fecha/hora con formato dd/mm/yyyy hh:mm:ss.
 * Los campos faltantes se rellenan con la fecha actual y hora 00:00:00.
 * Los años de 2 dígitos se interpretan como 20xx.
 *
 * @param {string} formatted - Cadena a validar.
 * @param {string} dd   - Día actual (2 dígitos) como fallback.
 * @param {string} mm   - Mes actual (2 dígitos) como fallback.
 * @param {string} yyyy - Año actual (4 dígitos) como fallback.
 * @returns {{ valida: boolean, d: string, m: string, y: string, h: string, mi: string, ss: string }}
 */
function K2ValidarFecha2(formatted, dd, mm, yyyy) {
    const HH = '00', MI = '00', SS = '00';
    const partes = formatted.trim().split(/[\/:\s]+/);

    const d  = (partes[0] || dd).padStart(2, '0').substring(0, 2);
    const m  = (partes[1] || mm).padStart(2, '0').substring(0, 2);
    let   y  = partes[2] || yyyy;
    const h  = (partes[3] || HH).padStart(2, '0').substring(0, 2);
    const mi = (partes[4] || MI).padStart(2, '0').substring(0, 2);
    const ss = (partes[5] || SS).padStart(2, '0').substring(0, 2);

    // Convierte año de 2 dígitos (ej: "25") a 4 dígitos ("2025").
    if (parseInt(y) < 100) y = String(parseInt(y) + 2000);
    y = y.padEnd(4, '0').substring(0, 4);

    // Crea un objeto Date y comprueba que los componentes sean consistentes
    // (JavaScript normaliza fechas inválidas, por lo que hay que verificar).
    const fechaV = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(mi), parseInt(ss));
    const valida = (
        fechaV.getFullYear() === parseInt(y) &&
        fechaV.getMonth()    === parseInt(m) - 1 &&
        fechaV.getDate()     === parseInt(d) &&
        fechaV.getHours()    === parseInt(h) &&
        fechaV.getMinutes()  === parseInt(mi) &&
        fechaV.getSeconds()  === parseInt(ss)
    );

    return {
        valida,
        d, m, y, h, mi, ss
    };
}

// =============================================================================
// SECCIÓN 6: MANEJO DE TECLADO PARA CAMPOS DE FECHA/HORA (K2FechaKeyDown)
// Controla la entrada de fechas con formato dd/mm/yyyy hh:mm:ss, gestionando
// deshacer/rehacer, navegación, formateo automático y salto al campo siguiente
// (parámetro `salto`) al completar una fecha válida con Enter.
// =============================================================================

/**
 * Manejador del evento keydown para campos de fecha/hora.
 * @param {KeyboardEvent}   event  - Evento de teclado.
 * @param {HTMLInputElement} input - El campo de entrada.
 * @param {string} label  - ID del elemento donde mostrar mensajes de error.
 * @param {string} salto  - ID del elemento al que saltar al confirmar con Enter.
 * @returns {boolean}
 */
function K2FechaKeyDown(event, input, label, salto) {

    // --- Bloque: Deshacer (Ctrl+Z) ---
    const esDeshacer = (event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'z' || event.key === 'Z');
    // --- Bloque: Rehacer (Ctrl+Y o Ctrl+Shift+Z) ---
    const esRehacer  = ((event.ctrlKey || event.metaKey) && (event.key === 'y' || event.key === 'Y')) ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'z' || event.key === 'Z'));

    if (esDeshacer) {
        const historial = K2GetHistoricoFecha(input);
        if (historial.deshacer.length > 0) {
            historial.rehacer.push({ valor: input.value, pos: input.selectionStart, posFin: input.selectionEnd });
            const estado = historial.deshacer.pop();
            input.value = estado.valor;
            input.setSelectionRange(estado.pos, estado.posFin);
        }
        event.preventDefault();
        return false;
    }
    if (esRehacer) {
        const historial = K2GetHistoricoFecha(input);
        if (historial.rehacer.length > 0) {
            historial.deshacer.push({ valor: input.value, pos: input.selectionStart, posFin: input.selectionEnd });
            const estado = historial.rehacer.pop();
            input.value = estado.valor;
            input.setSelectionRange(estado.pos, estado.posFin);
        }
        event.preventDefault();
        return false;
    }

    // --- Bloque: Permitir combinaciones Ctrl/Meta y Shift+Delete sin más procesamiento ---
    if (event.ctrlKey || event.metaKey) return true;
    if (event.shiftKey && event.key === 'Delete') return true;

    // --- Bloque: Filtro de teclas permitidas ---
    // Solo dígitos, espacio, Enter, teclas de navegación y borrado.
    const teclaPermitida =
        event.key === ' ' || event.keyCode === 32 ||
        event.key === 'Enter' || event.keyCode === 13 ||
        event.key === 'Backspace' || event.key === 'Delete' ||
        event.key === 'Tab' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'Home' || event.key === 'End' ||
        event.ctrlKey || event.metaKey ||
        /^[0-9]$/.test(event.key);

    if (!teclaPermitida) {
        event.preventDefault();
        return false;
    }

    // --- Bloque: Limpiar mensaje de aviso ---
    const AV = document.getElementById(label);

    if (AV) {
        AV.innerText = '';
        AV.classList.remove("aviso");
    }

    // --- Bloque: Obtener la fecha actual como valores de fallback ---
    const hoy  = new Date();
    const dd   = String(hoy.getDate()).padStart(2, '0');
    const mm   = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = String(hoy.getFullYear());

    // --- Bloque: Clasificación de la tecla presionada ---
    const esDigito = /^[0-9]$/.test(event.key);
    const esBorrar = event.key === 'Backspace';
    const esDel    = event.key === 'Delete';
    const pos      = input.selectionStart;
    const posFin   = input.selectionEnd;

    // --- Bloque: Simulación del nuevo valor tras la tecla ---
    // Construye cómo quedaría el valor si se aplica la tecla actual.
    const valorConTecla = esDigito ? input.value.slice(0, pos) + event.key + input.value.slice(posFin)
        : esBorrar ? (pos !== posFin ? input.value.slice(0, pos) + input.value.slice(posFin)
            : input.value.slice(0, pos - 1) + input.value.slice(pos))
            : esDel ? (pos !== posFin ? input.value.slice(0, pos) + input.value.slice(posFin)
                : input.value.slice(0, pos) + input.value.slice(pos + 1))
                : input.value;

    let pos2 = pos;

    const esEnter = event.key === 'Enter' || event.keyCode === 13;

    // --- Bloque: Validación del valor simulado ---
    // Colorea el borde en rojo si la fecha no es válida.
    const r = K2ValidarFecha2(valorConTecla, dd, mm, yyyy);
    input.style.borderColor = r.valida ? '' : 'red';

    // --- Bloque: Completar la fecha al presionar Enter (longitud < 19) ---
    // Si la fecha no está completa (19 chars = "dd/mm/yyyy hh:mm:ss"),
    // rellena con los componentes validados y posiciona el cursor.
    let len = input.value.length;
    if (esEnter && len !== 19) {
        event.preventDefault();
        if (len < 11) {
            input.value = `${r.d}/${r.m}/${r.y} `;
        } else {
            input.value = `${r.d}/${r.m}/${r.y} ${r.h}:${r.mi}:${r.ss}`;
        }

        if (len < 11) {
            input.setSelectionRange(11, 11);
        } else {
            input.setSelectionRange(19, 19);
        }

        return false;
    } else {
        // --- Bloque: Procesamiento de dígito/borrado con formateo automático ---
        // Extrae solo dígitos, inserta separadores (/ : espacio) en las
        // posiciones correctas y recalcula la posición del cursor.
        if (esDigito || esBorrar || esDel) {

            K2GuardarEstadoFecha(input);
            event.preventDefault();

            let digits    = valorConTecla.replace(/[^0-9]/g, '');
            let formatted = '';
            const esSeperador  = /[\/:\s]/.test(input.value[pos - 1]); // Hay separador antes del cursor
            const esSeperadorP = /[\/:\s]/.test(input.value[pos]);     // Hay separador en el cursor
            const cursorAlFinal = input.selectionStart === input.value.length;
            if (esDigito)  { pos2 += 1; }
            if (esBorrar)  { pos2 -= 1; }
            if (esBorrar && esSeperador)  { pos2 += 1; } // No retroceder sobre separador
            if (esDigito  && esSeperadorP) { pos2 += 1; } // Saltar separador al avanzar

            // Reconstituye el formato dd/mm/yyyy hh:mm:ss insertando separadores.
            for (let i = 0; i < digits.length; i++) {
                if (i === 2 || i === 4) {
                    formatted += '/';
                    if (cursorAlFinal) { pos2 += 1; }
                }
                if (i === 8) {
                    formatted += ' ';
                    if (cursorAlFinal) { pos2 += 1; }
                }
                if (i === 10) {
                    formatted += ':';
                    if (cursorAlFinal) { pos2 += 1; }
                }
                if (i === 12) {
                    formatted += ':';
                    if (cursorAlFinal) { pos2 += 1; }
                }
                if (i >= 14) break; // Máximo 14 dígitos (ddmmyyyyhhmmss)
                formatted += digits[i];
            }
            input.value = formatted;
            input.setSelectionRange(pos2, pos2);

            // Revalida con el nuevo valor formateado.
            const r2 = K2ValidarFecha2(formatted, dd, mm, yyyy);
            input.style.borderColor = r2.valida ? '' : 'red';

            return false;
        }
    }

    // --- Bloque: Enter con fecha inválida → mostrar aviso ---
    if (esEnter && !r.valida) {
        event.preventDefault();
        if (AV) {
            AV.innerText = 'Fecha o Hora NO VÁLIDA.';
            AV.classList.add("aviso");
        }
        input.focus();
        return false;
    }

    // --- Bloque: Enter con fecha completa y válida → saltar al siguiente campo ---
    if (esEnter && input.value.length === 19 && r.valida) {
        event.preventDefault();
        const fi = document.getElementById(salto);
        if (fi) fi.focus();
        return false;
    }

    return true;
}

// =============================================================================
// SECCIÓN 7: MANEJO DE PEGADO PARA CAMPOS DE FECHA/HORA (K2FechaPaste)
// Normaliza el texto pegado extrayendo solo dígitos y reconstruyendo el
// formato dd/mm/yyyy hh:mm:ss, validando el resultado visualmente.
// =============================================================================

/**
 * Manejador del evento paste para campos de fecha/hora.
 * @param {ClipboardEvent}  event  - Evento de pegado.
 * @param {HTMLInputElement} input - El campo de entrada.
 * @param {string} label           - ID del elemento donde mostrar mensajes de error.
 */
function K2FechaPaste(event, input, label) {

    if (input.disabled || input.readOnly) return false;

    K2GuardarEstadoFecha(input);

    event.preventDefault();

    // --- Bloque: Obtener la fecha actual como valores de fallback ---
    const hoy  = new Date();
    const dd   = String(hoy.getDate()).padStart(2, '0');
    const mm   = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = String(hoy.getFullYear());

    // Limpia el aviso de error si existe.
    const AV = document.getElementById(label);
    if (AV) {
        AV.innerText = '';
        AV.classList.remove("aviso");
    }

    const pos         = input.selectionStart;
    const posFin      = input.selectionEnd;
    const textoPegado = (event.clipboardData || window.clipboardData).getData('text');

    // --- Bloque: Combinación del valor existente con el texto pegado ---
    const valorCrudo = input.value.slice(0, pos) + textoPegado + input.value.slice(posFin);

    // Extrae solo los dígitos del valor combinado.
    let digits = valorCrudo.replace(/[^0-9]/g, '');

    // --- Bloque: Reconstrucción del formato dd/mm/yyyy hh:mm:ss ---
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
        if (i === 2 || i === 4) formatted += '/';
        if (i === 8)  formatted += ' ';
        if (i === 10 || i === 12) formatted += ':';
        if (i >= 14) break;
        formatted += digits[i];
    }

    input.value = formatted;

    // --- Bloque: Validación visual del resultado ---
    const r = K2ValidarFecha2(formatted, dd, mm, yyyy);
    input.style.borderColor = r.valida ? '' : 'red';

    // Coloca el cursor al final del valor formateado.
    input.setSelectionRange(formatted.length, formatted.length);
}

// =============================================================================
// SECCIÓN 8: VALIDACIÓN ESTRICTA DE FECHA/HORA COMPLETA (K2FechaHoraValida)
// Verifica que una cadena con formato exacto "dd/mm/yyyy hh:mm:ss" sea una
// fecha y hora válida (19 caracteres, todos los componentes correctos).
// =============================================================================

/**
 * Comprueba si una cadena tiene el formato exacto "dd/mm/yyyy hh:mm:ss" y
 * representa una fecha y hora válidas.
 * @param {string} valor - La cadena a validar.
 * @returns {boolean} true si es válida, false en caso contrario.
 */
function K2FechaHoraValida(valor) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
    const match = valor.match(regex);
    if (!match) return false;

    const dia  = parseInt(match[1]);
    const mes  = parseInt(match[2]) - 1; // Mes 0-indexado para el constructor Date
    const anio = parseInt(match[3]);
    const hora = parseInt(match[4]);
    const min  = parseInt(match[5]);
    const seg  = parseInt(match[6]);

    const fecha = new Date(anio, mes, dia, hora, min, seg);

    // Verifica que Date no haya normalizado valores fuera de rango
    // (ej: día 32 → día 1 del mes siguiente).
    return (
        fecha.getFullYear() === anio &&
        fecha.getMonth()    === mes  &&
        fecha.getDate()     === dia  &&
        fecha.getHours()    === hora &&
        fecha.getMinutes()  === min  &&
        fecha.getSeconds()  === seg
    );
}
