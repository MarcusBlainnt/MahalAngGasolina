// Form validation
document.getElementById('ticketForm')?.addEventListener('submit', function(e) {
  const fuelQty = document.querySelector('input[name="fuel_qty"]').value;
  const cost = document.querySelector('input[name="cost"]').value;
  if (fuelQty <= 0 || cost <= 0) {
    e.preventDefault();
    alert('Fuel quantity and cost must be positive.');
  }
});

// PDF generation helper (using jsPDF)
function generatePDF(elementId, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const element = document.getElementById(elementId);
  doc.html(element, {
    callback: function (doc) {
      doc.save(filename);
    },
    x: 10,
    y: 10,
    width: 190,
    windowWidth: 800
  });
}

// Optional: Add PDF buttons if needed
document.addEventListener('DOMContentLoaded', function() {
  const printAreas = document.querySelectorAll('.print-section');
  printAreas.forEach(area => {
    const btn = area.parentElement.querySelector('button[onclick*="printDiv"]');
    if (btn) {
      btn.insertAdjacentHTML('afterend', ' <button onclick="generatePDF(\'' + area.id + '\', \'ticket.pdf\')" class="btn btn-warning ms-2 no-print">Download PDF</button>');
    }
  });
});
