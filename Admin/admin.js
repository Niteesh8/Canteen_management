document.addEventListener('DOMContentLoaded', () => {
    const checkboxContainer = document.getElementById('checkbox-container');
    const adminForm = document.getElementById('admin-form');
    const messageElement = document.getElementById('message');

    let allMenuItems = []; // To store all menu items with their details

    // Function to fetch full menu and available items
    async function fetchMenuAndAvailability() {
        try {
            // Fetch full menu from the server
            const menuResponse = await fetch('/api/menu');
            if (!menuResponse.ok) {
                throw new Error(`HTTP error! status: ${menuResponse.status}`);
            }
            const menuData = await menuResponse.json();
            allMenuItems = menuData.categories.flatMap(category => category.items); // Flatten all items for easy lookup

            // Fetch currently available items
            const availabilityResponse = await fetch('/api/available-items');
            if (!availabilityResponse.ok) {
                throw new Error(`HTTP error! status: ${availabilityResponse.status}`);
            }
            const availabilityData = await availabilityResponse.json();
            const availableItemIds = new Set(availabilityData.availableItems);

            // Clear previous checkboxes
            checkboxContainer.innerHTML = '';

            // Render checkboxes grouped by category
            menuData.categories.forEach(category => {
                const categoryHeader = document.createElement('h3');
                categoryHeader.textContent = category.name;
                categoryHeader.style.marginTop = '20px';
                categoryHeader.style.marginBottom = '10px';
                categoryHeader.style.color = '#555';
                categoryHeader.style.textAlign = 'left';
                checkboxContainer.appendChild(categoryHeader);

                // Create a wrapper for items within this category for side-by-side display
                const categoryItemsWrapper = document.createElement('div');
                categoryItemsWrapper.className = 'category-items-wrapper'; // This class is styled in admin/style.css
                checkboxContainer.appendChild(categoryItemsWrapper); // Append wrapper to the main container

                category.items.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'menu-item-checkbox'; // Class for individual item styling
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = item.id; // Use item.id for the checkbox ID
                    input.name = 'availableItems'; // Name for form submission
                    input.value = item.id; // Value to send to server

                    // Check if item is currently available
                    if (availableItemIds.has(item.id)) {
                        input.checked = true;
                    }

                    const label = document.createElement('label');
                    label.htmlFor = item.id;
                    label.textContent = item.name; // Display only name (no price)

                    div.appendChild(input);
                    div.appendChild(label);
                    // Append the item div to the category-specific wrapper
                    categoryItemsWrapper.appendChild(div);
                });
            });

        } catch (error) {
            console.error('Failed to load menu or availability:', error);
            checkboxContainer.innerHTML = '<p style="color: red;">Error loading menu items. Please check server logs.</p>';
        }
    }

    // Handle form submission
    adminForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        messageElement.textContent = 'Updating...';
        messageElement.style.color = 'orange';

        const selectedCheckboxes = Array.from(checkboxContainer.querySelectorAll('input[type="checkbox"]:checked'));
        const selectedItemIds = selectedCheckboxes.map(checkbox => checkbox.value);

        try {
            const response = await fetch('/api/update-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ availableItems: selectedItemIds })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.text(); // Server sends plain text response
            messageElement.textContent = result;
            messageElement.style.color = 'green';
        } catch (error) {
            console.error('Error updating availability:', error);
            messageElement.textContent = `Error: ${error.message}. Please try again.`;
            messageElement.style.color = 'red';
        }
    });

    // Initial fetch when the page loads
    fetchMenuAndAvailability();
});