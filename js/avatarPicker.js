document.addEventListener("DOMContentLoaded", () => {
  const selectedImg = document.getElementById("selected-avatar");
  const selectedHair = document.getElementById("selected-hair");
  const selectedClothes = document.getElementById("selected-clothes");
  if (!selectedImg || !selectedHair || !selectedClothes) return;

  const savedAvatar = localStorage.getItem("selectedAvatar");
  const savedHair = localStorage.getItem("selectedHair");
  const savedHairId = localStorage.getItem("selectedHairId");
  const savedClothes = localStorage.getItem("selectedClothes");
  const savedClothesId = localStorage.getItem("selectedClothesId");

  if (savedAvatar) selectedImg.src = savedAvatar;

  selectedHair.className = "";
  if (savedHairId) {
    selectedHair.classList.add(savedHairId);
  }

  if (savedHair) {
    selectedHair.src = savedHair;
    selectedHair.style.display = "block";
  } else {
    selectedHair.removeAttribute("src");
    selectedHair.style.display = "none";
  }

  selectedClothes.className = "";
  if (savedClothesId) {
    selectedClothes.classList.add(savedClothesId);
  }

  if (savedClothes) {
    selectedClothes.src = savedClothes;
    selectedClothes.style.display = "block";
  } else {
    selectedClothes.removeAttribute("src");
    selectedClothes.style.display = "none";
  }
});
