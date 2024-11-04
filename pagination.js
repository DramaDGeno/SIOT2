$(document).ready(function () {
  let data = []; // Variable para almacenar los datos de la API
  let filteredData = []; // Para almacenar datos filtrados
  let currentPage = 1;
  const pageSize = 10; // Tamaño de cada página

  // Fetch de datos de la API
  fetch('http://127.0.0.1:3000/api/historial')
    .then(response => response.json())
    .then(apiData => {
      data = apiData;
      filteredData = data;
      updateTable();
    })
    .catch(error => console.error(error));

  // Función para actualizar la tabla con datos paginados
  function updateTable() {
    const tableBody = $('#historial-table tbody');
    tableBody.empty(); // Limpiar la tabla

    // Paginación
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredData.slice(start, end);

    // Rellenar la tabla
    pageData.forEach(item => {
      const fechaFormateada = new Date(item.fecha).toLocaleDateString();
      const row = `<tr>
                    <td>${fechaFormateada}</td>
                    <td>${item.tipo}</td>
                    <td>${item.habitacionesocupadas}</td>
                    <td>${item.habitacionestotales}</td>
                  </tr>`;
      tableBody.append(row);
    });

    // Actualizar info de paginación
    $('#pageInfo').text(`Página ${currentPage} de ${Math.ceil(filteredData.length / pageSize)}`);
    $('#prevPage').prop('disabled', currentPage === 1);
    $('#nextPage').prop('disabled', currentPage === Math.ceil(filteredData.length / pageSize));
  }

  // Búsqueda en tiempo real
  $('#searchInput').on('input', function () {
    const query = $(this).val().toLowerCase();
    filteredData = data.filter(item => 
      item.tipo.toLowerCase().includes(query) ||
      new Date(item.fecha).toLocaleDateString().includes(query) ||
      item.habitacionesocupadas.toString().includes(query) ||
      item.habitacionestotales.toString().includes(query)
    );
    currentPage = 1; // Resetear a la primera página
    updateTable();
  });

  // Botones de paginación
  $('#prevPage').on('click', function () {
    if (currentPage > 1) {
      currentPage--;
      updateTable();
    }
  });

  $('#nextPage').on('click', function () {
    if (currentPage < Math.ceil(filteredData.length / pageSize)) {
      currentPage++;
      updateTable();
    }
  });
});
