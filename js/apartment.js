const inventoryPanel = document.getElementById("inventory-panel");
const toggleInventory = document.getElementById("toggle-inventory");
const inventoryItems = document.getElementById("inventory-items");
const apartmentSquare = document.getElementById("apartment-square");

let purchasedItems = JSON.parse(localStorage.getItem("purchasedItems")) || [];
let shopItems = JSON.parse(localStorage.getItem("shopItems")) || [];
let placedItems =
  JSON.parse(localStorage.getItem("placedApartmentItems")) || [];

let selectedInstanceId = null;
let isEditMode = false;

const apartmentItems = shopItems.filter((item) => item.type === "apartment");

toggleInventory.addEventListener("click", () => {
  inventoryPanel.classList.toggle("closed");

  isEditMode = !inventoryPanel.classList.contains("closed");

  toggleInventory.textContent = isEditMode ? "Close Editor" : "Edit Furniture";

  if (!isEditMode) {
    selectedInstanceId = null;
  }

  renderApartment();
});

function savePlacedItems() {
  localStorage.setItem("placedApartmentItems", JSON.stringify(placedItems));
}

function renderInventory() {
  inventoryItems.innerHTML = "";

  const availableItems = apartmentItems.filter(
    (item) =>
      purchasedItems.includes(item.id) &&
      !placedItems.some((placed) => placed.id === item.id),
  );

  if (availableItems.length === 0) {
    inventoryItems.textContent = "No available apartment items.";
    return;
  }

  availableItems.forEach((item) => {
    const button = document.createElement("button");
    button.className = "inventory-item";

    const preview = document.createElement("img");
    preview.src = item.src;
    preview.alt = item.name;
    preview.className = "inventory-preview";

    const label = document.createElement("div");
    label.textContent = item.name;

    button.appendChild(preview);
    button.appendChild(label);

    button.addEventListener("click", () => {
      placedItems.push({
        instanceId: crypto.randomUUID(),
        id: item.id,
        x: 40,
        y: 40,
        width: 130,
        height: 80,
        rotation: 0,
      });

      savePlacedItems();
      renderApartment();
      renderInventory();
    });

    inventoryItems.appendChild(button);
  });
}

function renderApartment() {
  apartmentSquare.innerHTML = "";

  placedItems.forEach((placedItem, index) => {
    const item = apartmentItems.find(
      (shopItem) => shopItem.id === placedItem.id,
    );
    if (!item) return;

    const wrapper = document.createElement("div");
    wrapper.className = "furniture-wrapper";

    if (isEditMode && selectedInstanceId === placedItem.instanceId) {
      wrapper.classList.add("selected");
    }

    wrapper.style.left = `${placedItem.x}px`;
    wrapper.style.top = `${placedItem.y}px`;
    wrapper.style.width = `${placedItem.width || 130}px`;
    wrapper.style.height = `${placedItem.height || 80}px`;
    wrapper.style.transform = `rotate(${placedItem.rotation || 0}deg)`;
    wrapper.draggable = isEditMode;

    const furniture = document.createElement("img");
    furniture.src = item.src;
    furniture.alt = item.name;
    furniture.className = "placed-furniture";
    furniture.draggable = false;

    wrapper.appendChild(furniture);

    if (isEditMode) {
      const resizeHandle = document.createElement("div");
      resizeHandle.className = "resize-handle";
      wrapper.appendChild(resizeHandle);

      resizeHandle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();

        selectedInstanceId = placedItem.instanceId;

        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = placedItem.width || 130;
        const startHeight = placedItem.height || 80;

        function onMouseMove(moveEvent) {
          placedItem.width = Math.max(
            50,
            startWidth + (moveEvent.clientX - startX),
          );

          placedItem.height = Math.max(
            40,
            startHeight + (moveEvent.clientY - startY),
          );

          wrapper.style.width = `${placedItem.width}px`;
          wrapper.style.height = `${placedItem.height}px`;
        }

        function onMouseUp() {
          savePlacedItems();
          renderApartment();
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    }

    wrapper.addEventListener("dragstart", (event) => {
      if (!isEditMode) {
        event.preventDefault();
        return;
      }

      if (event.target.classList.contains("resize-handle")) {
        event.preventDefault();
        return;
      }

      event.dataTransfer.setData("text/plain", index);
    });

    wrapper.addEventListener("click", (event) => {
      if (!isEditMode) return;

      event.stopPropagation();
      selectedInstanceId = placedItem.instanceId;
      renderApartment();
    });

    apartmentSquare.appendChild(wrapper);
  });
}

apartmentSquare.addEventListener("click", () => {
  if (!isEditMode) return;

  selectedInstanceId = null;
  renderApartment();
});

apartmentSquare.addEventListener("dragover", (event) => {
  if (!isEditMode) return;

  event.preventDefault();
});

apartmentSquare.addEventListener("drop", (event) => {
  if (!isEditMode) return;

  event.preventDefault();

  const index = Number(event.dataTransfer.getData("text/plain"));
  const rect = apartmentSquare.getBoundingClientRect();

  if (!placedItems[index]) return;

  placedItems[index].x = event.clientX - rect.left - 60;
  placedItems[index].y = event.clientY - rect.top - 40;

  selectedInstanceId = placedItems[index].instanceId;

  savePlacedItems();
  renderApartment();
});

document.addEventListener("keydown", (event) => {
  if (!isEditMode || !selectedInstanceId) return;

  const selectedIndex = placedItems.findIndex(
    (item) => item.instanceId === selectedInstanceId,
  );

  if (selectedIndex === -1) return;

  const selectedItem = placedItems[selectedIndex];
  const moveDistance = event.shiftKey ? 10 : 5; // Hold shift for bigger moves

  if (event.key.toLowerCase() === "r") {
    selectedItem.rotation = (selectedItem.rotation || 0) + 90;
    savePlacedItems();
    renderApartment();
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    placedItems.splice(selectedIndex, 1);
    selectedInstanceId = null;
    savePlacedItems();
    renderApartment();
    renderInventory();
  }

  // Arrow key controls
  if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedItem.y = Math.max(0, selectedItem.y - moveDistance);
    savePlacedItems();
    renderApartment();
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedItem.y += moveDistance;
    savePlacedItems();
    renderApartment();
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    selectedItem.x = Math.max(0, selectedItem.x - moveDistance);
    savePlacedItems();
    renderApartment();
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    selectedItem.x += moveDistance;
    savePlacedItems();
    renderApartment();
  }
});

renderApartment();
renderInventory();
