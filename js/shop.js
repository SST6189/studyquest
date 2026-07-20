const shopCoinTotal = document.getElementById("shop-coin-total");
const shopStatus = document.getElementById("shop-status");
const shopButtons = document.querySelectorAll(".shop-item button");

function safeJSONParse(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

let totalCoins = parseInt(localStorage.getItem("totalCoins"), 10) || 0;
let purchasedItems =
  safeJSONParse(localStorage.getItem("purchasedItems")) || [];
let currentAvatarId = localStorage.getItem("selectedAvatarId") || "";
let currentAvatarSrc = localStorage.getItem("selectedAvatar") || "";
let currentHairId = localStorage.getItem("selectedHairId") || "";
let currentHairSrc = localStorage.getItem("selectedHair") || "";
let currentClothesId = localStorage.getItem("selectedClothesId") || "";
let currentClothesSrc = localStorage.getItem("selectedClothes") || "";

function isAvatarButton(button) {
  return button.dataset.type === "avatar";
}

function isHairButton(button) {
  return button.dataset.type === "hair";
}

function isClothesButton(button) {
  return button.dataset.type === "clothes";
}

function equipItem(type, itemId, itemSrc) {
  if (type === "avatar") {
    currentAvatarId = itemId;
    currentAvatarSrc = itemSrc;
    localStorage.setItem("selectedAvatarId", currentAvatarId);
    localStorage.setItem("selectedAvatar", currentAvatarSrc);
  }

  if (type === "hair") {
    currentHairId = itemId;
    currentHairSrc = itemSrc;
    localStorage.setItem("selectedHairId", currentHairId);
    localStorage.setItem("selectedHair", currentHairSrc);
  }

  if (type === "clothes") {
    currentClothesId = itemId;
    currentClothesSrc = itemSrc;
    localStorage.setItem("selectedClothesId", currentClothesId);
    localStorage.setItem("selectedClothes", currentClothesSrc);
  }
}

function updateShopDisplay() {
  if (shopCoinTotal) shopCoinTotal.textContent = totalCoins;

  shopButtons.forEach((button) => {
    const itemId = button.dataset.item;
    const price = parseInt(button.dataset.price, 10) || 0;
    const owned = purchasedItems.includes(itemId);
    const isAvatar = isAvatarButton(button);
    const isHair = isHairButton(button);
    const isClothes = isClothesButton(button);
    const equipped = isAvatar
      ? currentAvatarId === itemId
      : isHair
        ? currentHairId === itemId
        : isClothes
          ? currentClothesId === itemId
          : false;

    if (owned) {
      if (isAvatar || isHair || isClothes) {
        button.textContent = equipped ? "Equipped" : "Equip";
        button.disabled = false;
      } else {
        button.textContent = "Owned";
        button.disabled = true;
      }
    } else if (price === 0) {
      button.disabled = false;
      button.textContent = "Free";
    } else if (totalCoins < price) {
      button.disabled = true;
      button.textContent = `${price} coins`;
    } else {
      button.disabled = false;
      button.textContent = `${price} coins`;
    }
  });
}

function showShopMessage(message, isError = false) {
  if (!shopStatus) return;
  shopStatus.textContent = message;
  shopStatus.style.color = isError ? "#c0392b" : "#2d8a37";
}

shopButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const itemId = button.dataset.item;
    const itemType = button.dataset.type || "apartment";
    const price = parseInt(button.dataset.price, 10) || 0;
    const itemName = button
      .closest(".shop-item")
      .querySelector("h3").textContent;
    const itemSrc = button.dataset.src || "";
    const owned = purchasedItems.includes(itemId);

    if (
      owned &&
      (itemType === "avatar" || itemType === "hair" || itemType === "clothes")
    ) {
      equipItem(itemType, itemId, itemSrc);
      updateShopDisplay();
      showShopMessage(`Equipped ${itemName}!`);
      return;
    }

    if (totalCoins < price) {
      showShopMessage("Not enough coins to buy this item.", true);
      return;
    }

    totalCoins -= price;
    if (!purchasedItems.includes(itemId)) {
      purchasedItems.push(itemId);
    }
    localStorage.setItem("totalCoins", totalCoins);
    localStorage.setItem("purchasedItems", JSON.stringify(purchasedItems));

    if (
      itemType === "avatar" ||
      itemType === "hair" ||
      itemType === "clothes"
    ) {
      equipItem(itemType, itemId, itemSrc);
    }

    updateShopDisplay();
    showShopMessage(`Purchased ${itemName}!`);
  });
});
function saveShopItemsCatalog() {
  const catalog = [];

  shopButtons.forEach((button) => {
    catalog.push({
      id: button.dataset.item,
      type: button.dataset.type || "apartment",
      src: button.dataset.src || "",
      price: parseInt(button.dataset.price, 10) || 0,
      name: button.closest(".shop-item").querySelector("h3").textContent,
    });
  });

  localStorage.setItem("shopItems", JSON.stringify(catalog));
}

saveShopItemsCatalog();
updateShopDisplay();
