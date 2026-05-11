# k2-input-formatter

Librería JavaScript para formatear campos de entrada numéricos y de fecha/hora
con formato español (separador de miles con punto, decimal con coma,
fecha dd/mm/yyyy hh:mm:ss).

## Características

- Formateo numérico con separador de miles (.) y decimal (,)
- Puedes usar el punto del teclado numérico como separador decimal en lugar de la coma
- Formateo de fecha/hora en formato dd/mm/yyyy hh:mm:ss
- Soporte para deshacer/rehacer (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
- Cortar con Ctrl+X y Shift+Delete
- Pegar con Ctrl+V y Shift+Insert
- Validación en tiempo real con indicador visual (borde rojo)
- Sin dependencias externas

## Instalación

Incluye el archivo directamente en tu página:

```html
<script src="k2-input-formatter.js"></script>
```

---

## Uso — Campo Numérico

### Parámetros

| Parámetro   | Tipo    | Descripción                                      |
|-------------|---------|--------------------------------------------------|
| `event`     | Event   | Evento del teclado o portapapeles                |
| `this`      | Input   | Referencia al campo de entrada                   |
| `decimales` | number  | Número máximo de decimales (0 = sin decimales)   |

> El número máximo de dígitos enteros se controla con el atributo `MaxLength` del campo.

### HTML

```html
<!-- Sin decimales -->
<input type="text"
       maxlength="8"
       onkeydown="K2NumerosKeyDown(event, this, 0)"
       onpaste="K2NumerosPaste(event, this, 0)">

<!-- Con 2 decimales -->
<input type="text"
       maxlength="10"
       onkeydown="K2NumerosKeyDown(event, this, 2)"
       onpaste="K2NumerosPaste(event, this, 2)">
```

### ASP.NET WebForms (ASPX)

```aspx
<%-- Sin decimales --%>
<asp:TextBox ID="Cantidad" runat="server"
             MaxLength="8"
             onkeydown="K2NumerosKeyDown(event, this, 0)"
             onpaste="K2NumerosPaste(event, this, 0)">
</asp:TextBox>

<%-- Con 2 decimales --%>
<asp:TextBox ID="Importe" runat="server"
             MaxLength="10"
             onkeydown="K2NumerosKeyDown(event, this, 2)"
             onpaste="K2NumerosPaste(event, this, 2)">
</asp:TextBox>
```

### Ejemplos de formato numérico

| Entrada del usuario | Resultado mostrado |
|---------------------|--------------------|
| `1234567`           | `1.234.567`        |
| `1234,56`           | `1.234,56`         |
| `,5`                | `0,5`              |
| `1234567` (0 dec.)  | `1.234.567`        |

---

## Uso — Campo de Fecha/Hora

### Parámetros

| Parámetro | Tipo   | Descripción                                                        |
|-----------|--------|--------------------------------------------------------------------|
| `event`   | Event  | Evento del teclado o portapapeles                                  |
| `input`   | Input  | Referencia al campo de entrada                                     |
| `label`   | string | ID del elemento HTML donde mostrar el mensaje de error             |
| `salto`   | string | ID del campo al que saltar cuando se confirma la fecha con Enter   |

> El formato esperado es `dd/mm/yyyy hh:mm:ss`. Los separadores (`/`, `:`, espacio)
> se insertan automáticamente mientras el usuario escribe.

### HTML

```html
<!-- Elemento para mostrar el aviso de error -->
<span id="avisoFecha"></span>

<!-- Campo de fecha -->
<input type="text"
       onkeydown="K2FechaKeyDown(event, this, 'avisoFecha', 'siguienteCampo')"
       onpaste="K2FechaPaste(event, this, 'avisoFecha')">

<!-- Campo siguiente (destino del salto con Enter) -->
<input type="text" id="siguienteCampo">
```

### ASP.NET WebForms (ASPX)

```aspx
<%-- Elemento para mostrar el aviso de error --%>
<asp:Label ID="avisoFecha" runat="server"></asp:Label>

<%-- Campo de fecha --%>
<asp:TextBox ID="FechaAlta" runat="server"
             onkeydown="K2FechaKeyDown(event, this, 'avisoFecha', 'siguienteCampo')"
             onpaste="K2FechaPaste(event, this, 'avisoFecha')">
</asp:TextBox>

<%-- Campo siguiente (destino del salto con Enter) --%>
<asp:TextBox ID="siguienteCampo" runat="server"></asp:TextBox>
```

> **Nota ASPX:** Si usas `asp:Label` o `asp:TextBox` como aviso, el ID renderizado
> en el HTML puede incluir el prefijo del contenedor (ej: `ctl00_avisoFecha`).
> En ese caso pasa el ID generado o usa `ClientIDMode="Static"` en el control.

### Ejemplos de formato de fecha

Los campos faltantes se completan automáticamente con el mes y año actuales al pulsar Enter.
Los ejemplos siguientes toman como fecha actual `05/05/2026`.

| Entrada                              | Resultado                  |
|--------------------------------------|----------------------------|
| `10` + Enter                         | `10/05/2026 `              |
| `1003` + Enter                       | `10/03/2026 `              |
| `100326` + Enter                     | `10/03/2026 `              |
| `10032026` + Enter                   | `10/03/2026 `              |
| `10` + Enter + `1530` + Enter        | `10/05/2026 15:30:00`      |
| `1512` + Enter + `1245` + Enter      | `15/12/2026 12:45:00`      |
| `10032026153045` + Enter             | `10/03/2026 15:30:45`      |

> Los años de 2 dígitos se interpretan como 20xx (ej: `26` → `2026`).

### Validación

- El borde del campo se pone en **rojo** si la fecha no es válida mientras se escribe.
- Al pulsar **Enter** con una fecha incompleta, se completa con el mes y año actuales y el cursor se posiciona esperando la hora.
- Al pulsar **Enter** con una hora incompleta o sin hora, los campos que falten se completan con `00` (ej: `15` → `15:00:00`, sin hora → `00:00:00`).
- Al pulsar **Enter** con una fecha inválida, se muestra el mensaje `Fecha o Hora NO VÁLIDA.` en el elemento indicado en `label`.
- Al pulsar **Enter** con la fecha y hora completas y válidas, el foco salta al campo indicado en `salto`.

---

## Validar una fecha por código

```javascript
// Devuelve true si el valor es una fecha/hora válida con formato dd/mm/yyyy hh:mm:ss
if (K2FechaHoraValida(document.getElementById('FechaAlta').value)) {
    // fecha válida
}
```

---

## Demo

Puedes probar la librería en vivo en:
[http://www.k2sistemas.net/k2-input-formatter](http://www.k2sistemas.net/k2-input-formatter)

---

## Licencia

MIT © [K2Sistemas.NET](https://k2sistemas.net)
