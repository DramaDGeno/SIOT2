// pagination.js

$(document).ready(function () {
    // Usamos fetch para obtener los datos de la API
    fetch('http://127.0.0.1:3000/api/historial')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al obtener el historial');
        }
        return response.json();
      })
      .then(data => {
        // Llenar la tabla con los datos
        const tableBody = $('#historial-table tbody');
        tableBody.empty(); // Limpiar la tabla antes de llenarla
  
        data.forEach(item => {
          const fechaFormateada = new Date(item.fecha).toLocaleDateString(); // Formato legible
          const row = `<tr>
                  <td>${fechaFormateada}</td>
                  <td>${item.tipo}</td>
                  <td>${item.habitacionesocupadas}</td>
                  <td>${item.habitacionestotales}</td>
              </tr>`;
          tableBody.append(row);
        });
  
        // Inicializar bootstrap-table después de llenar los datos
        $('#historial-table').bootstrapTable({
          pagination: true, // Habilitar paginación
          pageSize: 10, // Número de registros por página
          search: true, // Habilitar búsqueda
          showRefresh: false, // Botón de refrescar
          showToggle: false, // Botón para cambiar entre tabla y lista
          showColumns: false, // Botón para mostrar columnas
          formatLoadingMessage: function () {
              return ''; // Texto vacío para ocultar el mensaje de carga
          }
        });
      })
      .catch(error => {
        console.error(error);
      });
  });
  