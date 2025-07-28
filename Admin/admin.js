document.addEventListener('DOMContentLoaded', async function() {
    const checkboxContainer = document.getElementById('checkbox-container');
    const adminForm = document.getElementById('admin-form');
    const messageDiv = document.getElementById('message');

    let allMenuItems = []; // To store the full menu

    // Function to load and display checkboxes
    async function loadMenuAndAvailability() {
        try {
            // Fetch full menu
            const menuResponse = await fetch('/api/menu');
            allMenuItems = await menuResponse.json();

            // Fetch current availability
            const availableResponse = await fetch('/api/available-items');
            const availableData = await availableResponse.json();
            const currentlyAvailableIds = availableData.availableItems;

            checkboxContainer.innerHTML = ''; // Clear loading message

            allMenuItems.forEach(item => {
                const div = document.createElement('div');
                div.classList.add('menu-item-checkbox');

                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'availableItems'; // All checkboxes should have the same name
                checkbox.value = item.id;

                // Check if this item is currently available
                if (currentlyAvailableIds.includes(item.id)) {
                    checkbox.checked = true;
                }

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(item.name));
                div.appendChild(label);
                checkboxContainer.appendChild(div);
            });

        } catch (error) {
            console.error('Error loading menu or availability:', error);
            checkboxContainer.innerHTML = '<p style="color: red;">Error loading menu. Please try again.</p>';
        }
    }

    // Handle form submission
    adminForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission

        messageDiv.textContent = 'Updating...';
        messageDiv.style.color = 'orange';

        const selectedCheckboxes = Array.from(adminForm.elements.availableItems)
                                    .filter(checkbox => checkbox.checked)
                                    .map(checkbox => checkbox.value);

        try {
            const response = await fetch('/api/update-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ availableItems: selectedCheckboxes })
            });

            if (response.ok) {
                messageDiv.textContent = 'Availability updated successfully!';
                messageDiv.style.color = 'green';
                // Reload the checkboxes to reflect the saved state if needed (good for confirmation)
                await loadMenuAndAvailability();
            } else {
                const errorText = await response.text();
                messageDiv.textContent = `Error: ${errorText}`;
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Error updating availability:', error);
            messageDiv.textContent = 'Network error during update.';
            messageDiv.style.color = 'red';
        }
        setTimeout(() => messageDiv.textContent = '', 3000); // Clear message after 3 seconds
    });

    // Initial load
    loadMenuAndAvailability();
});