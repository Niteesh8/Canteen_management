document.addEventListener('DOMContentLoaded', async function() {
    const menuItemsDiv = document.getElementById('menu-items');
    const updateTimeSpan = document.getElementById('update-time');

    async function fetchAndUpdateMenu() {
        try {
            const [availableResponse, menuResponse] = await Promise.all([
                fetch('/api/available-items'),
                fetch('/api/menu')
            ]);

            const availableData = await availableResponse.json();
            const allMenuData = await menuResponse.json();

            const currentlyAvailableIds = availableData.availableItems;
            const lastUpdatedTime = availableData.lastUpdated;

            menuItemsDiv.innerHTML = ''; // Clear loading message

            if (currentlyAvailableIds.length > 0) {
                // Map available IDs to their full names from the menu.json
                const availableItemsFull = allMenuData.filter(item => currentlyAvailableIds.includes(item.id));

                availableItemsFull.forEach(item => {
                    const itemCard = document.createElement('div');
                    itemCard.classList.add('item-card');
                    itemCard.textContent = item.name;
                    menuItemsDiv.appendChild(itemCard);
                });
            } else {
                menuItemsDiv.innerHTML = '<p class="no-items">No items available at the moment. Please check back soon!</p>';
            }

            // Set the last updated time
            if (lastUpdatedTime) {
                updateTimeSpan.textContent = new Date(lastUpdatedTime).toLocaleString();
            } else {
                 updateTimeSpan.textContent = 'N/A';
            }

        } catch (error) {
            console.error('Error fetching menu data:', error);
            menuItemsDiv.innerHTML = '<p class="no-items" style="color: red;">Could not load menu. Please try again later.</p>';
            updateTimeSpan.textContent = 'Error';
        }
    }

    // Fetch and update initially
    fetchAndUpdateMenu();

    // Optional: Auto-refresh the public display every minute (or more)
    // Be mindful of server load if many students are viewing.
    // setInterval(fetchAndUpdateMenu, 60000); // Refresh every 60 seconds
});
