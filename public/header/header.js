const burger = document.getElementById("pm-burger");
const panel = document.getElementById("pm-sidepanel");
const closeBtn = document.getElementById("pm-close-panel");
const backdrop = document.getElementById("pm-backdrop");

burger.onclick = () => {
  panel.classList.add("open");
  backdrop.classList.add("show");
};

closeBtn.onclick = closeMenu;
backdrop.onclick = closeMenu;

function closeMenu() {
  panel.classList.remove("open");
  backdrop.classList.remove("show");
}