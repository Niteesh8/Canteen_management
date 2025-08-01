document.addEventListener('DOMContentLoaded', () => {
    const menuItemsContainer = document.getElementById('menu-items');
    const lastUpdatedElement = document.getElementById('last-updated');

    let allMenuItems = {};

    async function fetchAndUpdateMenu() {
        try {
            const menuResponse = await fetch('/api/menu');
            if (!menuResponse.ok) {
                throw new Error(`HTTP error! status: ${menuResponse.status}`);
            }
            const fullMenu = await menuResponse.json();

            fullMenu.categories.forEach(category => {
                category.items.forEach(item => {
                    allMenuItems[item.id] = { ...item, categoryName: category.name };
                });
            });

            const availabilityResponse = await fetch('/api/available-items');
            if (!availabilityResponse.ok) {
                throw new Error(`HTTP error! status: ${availabilityResponse.status}`);
            }
            const availabilityData = await availabilityResponse.json();
            const availableItemIds = new Set(availabilityData.availableItems);

            menuItemsContainer.innerHTML = '';

            const categorizedAvailableItems = {};
            fullMenu.categories.forEach(category => {
                categorizedAvailableItems[category.name] = [];
            });

            availableItemIds.forEach(itemId => {
                const itemDetails = allMenuItems[itemId];
                if (itemDetails) {
                    categorizedAvailableItems[itemDetails.categoryName].push(itemDetails);
                }
            });

            let hasAvailableItems = false;
            for (const categoryName of Object.keys(categorizedAvailableItems)) {
                const itemsInCategory = categorizedAvailableItems[categoryName];

                if (itemsInCategory.length > 0) {
                    hasAvailableItems = true;
                    const categoryHeader = document.createElement('h2');
                    categoryHeader.textContent = categoryName;
                    categoryHeader.className = 'category-header';
                    menuItemsContainer.appendChild(categoryHeader);

                    itemsInCategory.sort((a, b) => a.name.localeCompare(b.name));

                    itemsInCategory.forEach(item => {
                        const itemCard = document.createElement('div');
                        itemCard.className = 'item-card';

                        const itemName = document.createElement('span');
                        itemName.className = 'item-name';
                        itemName.textContent = item.name;

                        itemCard.appendChild(itemName);
                        menuItemsContainer.appendChild(itemCard);
                    });
                }
            }

            if (!hasAvailableItems) {
                menuItemsContainer.innerHTML = '<p class="no-items">No items available at the moment. Please check back later!</p>';
            }

            if (availabilityData.lastUpdated) {
                const date = new Date(availabilityData.lastUpdated);
                lastUpdatedElement.textContent = `Last updated: ${date.toLocaleString()}`;
            } else {
                lastUpdatedElement.textContent = `Last updated: Never (or data unavailable)`;
            }

        } catch (error) {
            console.error('Failed to fetch and update menu:', error);
            menuItemsContainer.innerHTML = '<p class="no-items" style="color: red;">Error loading menu. Please try refreshing.</p>';
            lastUpdatedElement.textContent = 'Last updated: Error';
        }
    }

    fetchAndUpdateMenu();
    // setInterval(fetchAndUpdateMenu, 30000);
});