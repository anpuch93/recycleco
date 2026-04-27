function toggleFaq(item) {
  const reponse = item.querySelector(".faq-reponse");
  const chevron = item.querySelector(".faq-chevron");
  const estOuvert = reponse.style.display === "block";

  // Ferme tous les items
  document.querySelectorAll(".faq-reponse").forEach(r => r.style.display = "none");
  document.querySelectorAll(".faq-chevron").forEach(c => c.textContent = "▼");

  // Ouvre celui cliqué si il était fermé
  if (!estOuvert) {
    reponse.style.display = "block";
    chevron.textContent = "▲";
  }
}