const unavailableTimes = {};
let statusChart; // Variable global para almacenar la instancia del gráfico

function fetchStatus() {
    fetch('/status')
        .then(response => response.json())
        .then(data => {
            const statusList = document.getElementById('status-list');
            statusList.innerHTML = ''; // Limpiar la lista antes de actualizarla

            let availableCount = 0;
            let unavailableCount = 0;

            for (const [ip, status] of Object.entries(data)) {
                const listItem = document.createElement('li');
                listItem.className = `list-group-item ${status ? 'list-group-item-success' : 'list-group-item-danger'}`;

                // Crear el link de la IP
                const link = document.createElement('a');
                link.href = `http://${ip}`;
                link.target = '_blank';
                link.textContent = ip;
                link.style.marginRight = '10px';

                // Si no está disponible, registrar la hora
                if (!status) {
                    // Si la IP está no disponible y aún no tiene hora registrada
                    if (!unavailableTimes[ip]) {
                        unavailableTimes[ip] = new Date().toLocaleTimeString(); // Registrar la hora actual
                    }
                    const boldText = document.createElement('span');
                    boldText.style.fontWeight = 'bold';
                    boldText.textContent = 'No disponible';

                    listItem.appendChild(link);
                    listItem.appendChild(boldText);
                    listItem.appendChild(document.createTextNode(` desde ${unavailableTimes[ip]}`));
                } else {
                    const boldText = document.createElement('span');
                    boldText.style.fontWeight = 'bold';
                    boldText.textContent = 'Disponible';

                    listItem.appendChild(link);
                    listItem.appendChild(boldText);

                    // Si la IP vuelve a estar disponible, eliminar la hora registrada
                    delete unavailableTimes[ip];
                }

                // Botón para eliminar la IP
                const removeButton = document.createElement('button');
                removeButton.className = 'btn btn-danger btn-sm float-right';
                removeButton.onclick = () => removeIP(ip);

                const icon = document.createElement('i');
                icon.className = 'bi bi-trash';
                icon.style.marginRight = '5px';
                removeButton.appendChild(icon);

                removeButton.appendChild(document.createTextNode(' '));

                listItem.appendChild(removeButton);
                statusList.appendChild(listItem);

                // Contar el número de IPs disponibles y no disponibles
                if (status) {
                    availableCount++;
                } else {
                    unavailableCount++;
                }
            }

            // Actualizar los conteos en el HTML
            document.getElementById('available-count').textContent = `Disponible: ${availableCount}`;
            document.getElementById('unavailable-count').textContent = `No disponible: ${unavailableCount}`;

            // Actualizar la gráfica
            updateChart(availableCount, unavailableCount);
        })
        .catch(error => {
			console.error('Error al obtener el estado:', error);
			showNotificationModal('Error', 'Hubo un problema al obtener el estado de las IPs.');
		});
}

function updateChart(availableCount, unavailableCount) {
    const ctx = document.getElementById('status-chart').getContext('2d');

    if (statusChart) {
        // Actualizar datos si el gráfico ya existe
        statusChart.data.datasets[0].data = [availableCount, unavailableCount];
        statusChart.update();
    } else {
        // Crear el gráfico si aún no existe
        statusChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Disponible', 'No disponible'],
                datasets: [{
                    data: [availableCount, unavailableCount],
                    backgroundColor: ['#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return `${tooltipItem.label}: ${tooltipItem.raw}`;
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 5,
                        bottom: 5
                    }
                }
            }
        });
    }
}

function addIP() {
    const ipInput = document.getElementById('new-ip');
    const newIP = ipInput.value.trim();
    const ipPattern = /^(25[0-5]|2[0-4]\d|1\d{2}|\d{1,2})(\.(25[0-5]|2[0-4]\d|1\d{2}|\d{1,2})){3}$/;

    if (newIP && ipPattern.test(newIP)) {
        // La IP es válida, realiza la petición al servidor
        fetch('/ips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ip: newIP }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'IP agregada') {
                showNotificationModal(`${data.message}: ${data.ip}`);  // Mostrar IP agregada
                fetchStatus(); // Actualizar lista de estados
                ipInput.value = ''; // Limpiar input
            } else {
                showNotificationModal('La IP ya existe o es inválida');
            }
        })
        .catch(error => {
            console.error('Error al agregar la IP:', error);
            showNotificationModal('Hubo un problema al agregar la IP.');
        });
    } else {
        showNotificationModal('Ingrese una dirección IP válida (ej. 192.168.1.1)');
    }
}

function removeIP(ip) {
    showModal(
        'Eliminar IP',
        `¿Seguro que deseas eliminar la IP ${ip}?`,
        () => {
            fetch('/ips', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: ip }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'IP removida') {
                    showNotificationModal(`${data.message}: ${data.ip}`); // Mostrar IP eliminada
                    fetchStatus(); // Actualizar lista
                } else {
                    showNotificationModal('No se pudo eliminar la IP.');
                }
            })
            .catch(error => {
                console.error('Error al eliminar la IP:', error);
                showNotificationModal('Hubo un problema al eliminar la IP.');
            });
        }
    );
}


function showModal(title, message, confirmCallback) {
    const modalTitle = document.getElementById('customModalLabel');
    const modalBody = document.getElementById('customModalBody');
    const confirmBtn = document.getElementById('customModalConfirmBtn');

    modalTitle.textContent = title;
    modalBody.textContent = message;

    // Remover eventos anteriores
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        confirmCallback();
        $('#customModal').modal('hide');
    });

    $('#customModal').modal('show');
}

let notificationModalInstance = null;

function showNotificationModal(message) {
    const modalElement = document.getElementById('notificationModal');
    const messageContainer = document.getElementById('notificationMessage');
    messageContainer.textContent = message;

    // Inicializa el modal si aún no lo hiciste
    if (!notificationModalInstance) {
        notificationModalInstance = new bootstrap.Modal(modalElement);
    }

    // Mostrar el modal
    notificationModalInstance.show();

    // Cerrar el modal automáticamente después de 3 segundos
    setTimeout(() => {
        notificationModalInstance.hide();
    }, 3000);
}

// Actualizar cada 5 segundos
setInterval(fetchStatus, 5000);
fetchStatus(); // Llamar al cargar la página


