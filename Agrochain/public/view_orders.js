// Load the farmer ID from session storage
const farmerId = sessionStorage.getItem("farmerId");

// Fetch orders from the server when the page loads
window.onload = function() {
    fetchOrders();
};

// Function to fetch orders from the server
function fetchOrders() {
    fetch(`/api/orders/${farmerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.orders) {
                let ordersTable = document.getElementById("ordersBody");
                ordersTable.innerHTML = "";
                data.orders.forEach(order => {
                    let row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${order.orderId}</td>
                        <td>${order.productName}</td>
                        <td>${order.quantity}</td>
                        <td>${order.totalAmt}</td>
                        <td>${order.orderStatus}</td>
                        <td>
                            <button onclick="updateStatus(${order.orderId}, 'Order Accepted')">Accept Order</button>
                            <button onclick="updateStatus(${order.orderId}, 'Order Rejected')">Reject Order</button>
                            <button onclick="updateStatus(${order.orderId}, 'Ready for Shipment')">Ready for Shipment</button>
                            <button onclick="updateStatus(${order.orderId}, 'Delivery on the way')">Delivery on the Way</button>
                            <button onclick="updateStatus(${order.orderId}, 'Reached Destination')">Reached Destination</button>
                            <button onclick="openDeliveryModal(${order.orderId})">Mark as Delivered</button>
                        </td>
                    `;
                    ordersTable.appendChild(row);
                });
            }
        })
        .catch(error => console.log("Error fetching orders:", error));
}

// Function to update order status
function updateOrderStatus(orderId, status) {
    fetch(`/api/orders/update/${orderId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderStatus: status }),
    })
    .then(response => response.json())
    .then(data => {
        alert(`Order status updated to: ${status}`);
        fetchOrders();  // Refresh the orders table
    })
    .catch(error => console.log("Error updating status:", error));
}

// Function to open the modal for delivery
function openDeliveryModal(orderId) {
    sessionStorage.setItem("orderId", orderId);
    document.getElementById("deliveryModal").style.display = "flex";
}

// Function to close the delivery modal
function closeModal() {
    document.getElementById("deliveryModal").style.display = "none";
}

// Function to confirm delivery
function confirmDelivery() {
    const orderId = sessionStorage.getItem("orderId");
    const uniqueIdInput = document.getElementById("uniqueIdInput").value;

    fetch(`/api/verifyUniqueId/${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.uniqueId === uniqueIdInput) {
                updateStatus(orderId, 'Delivered');
                closeModal();
            } else {
                alert("Incorrect Unique ID! Please try again.");
            }
        })
        .catch(error => console.log("Error checking uniqueId:", error));
}
