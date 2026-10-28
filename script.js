const form = document.getElementById("orderForm");
const namaInput = document.getElementById("nama");
const whatsappInput = document.getElementById("whatsapp");
const qtyInput = document.getElementById("qty");
const dpInput = document.getElementById("dp");
const varianInput = document.getElementById("varian");
const totalPrice = document.getElementById("totalPrice");
const remainingPrice = document.getElementById("remainingPrice");
const statusMessage = document.getElementById("statusMessage");
const submitButton = document.getElementById("submitButton");

document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("unitPrice").textContent = rupiah(CONFIG.UNIT_PRICE);

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
  }).format(value);
}

function getAmounts() {
  const qty = Math.max(0, Number.parseInt(qtyInput.value, 10) || 0);
  const dp = Math.max(0, Number(dpInput.value) || 0);
  const total = qty * CONFIG.UNIT_PRICE;
  return { qty, dp, total, remaining: Math.max(0, total - dp) };
}

function updateSummary() {
  const amounts = getAmounts();
  totalPrice.textContent = rupiah(amounts.total);
  remainingPrice.textContent = rupiah(amounts.remaining);
  dpInput.max = String(amounts.total);
}
[qtyInput, dpInput].forEach(input => input.addEventListener("input", updateSummary));
updateSummary();

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function validateOrder() {
  const name = namaInput.value.trim();
  const phone = whatsappInput.value.trim().replace(/[\s()-]/g, "");
  const { qty, dp, total } = getAmounts();

  if (!name) throw new Error("Nama lengkap wajib diisi.");
  if (!/^\+?[0-9]{9,16}$/.test(phone)) throw new Error("Nomor WhatsApp harus berisi 9–16 digit angka, boleh diawali +.");
  if (!Number.isInteger(qty) || qty < 1) throw new Error("Jumlah pesanan minimal 1 pcs.");
  if (!Number.isFinite(dp) || dp < 0) throw new Error("Nominal DP tidak boleh negatif.");
  if (dp > total) throw new Error("DP tidak boleh lebih besar dari total pesanan.");
  if (!varianInput.value) throw new Error("Silakan pilih varian rasa.");
  return { nama: name, whatsapp: phone, qty, dp, total, sisaBayar: total - dp, varian: varianInput.value };
}

async function loadPublicVariants() {
  try {
    const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "public_list_variants" }) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error("Gagal memuat varian.");
    varianInput.replaceChildren();
    (result.data || []).forEach(item => { const option = document.createElement("option"); option.value = item.nama; option.textContent = item.nama; varianInput.append(option); });
    if (!varianInput.options.length) { const option = document.createElement("option"); option.value = "Belum ditentukan"; option.textContent = "Belum ada varian"; varianInput.append(option); }
  } catch (_) {
    varianInput.innerHTML = '<option value="Belum ditentukan">Varian belum tersedia</option>';
  }
}
loadPublicVariants();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus("", "");
  let order;

  try {
    order = validateOrder();
  } catch (error) {
    showStatus(error.message, "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Mengirim pesanan...";
  try {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_order", ...order })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Pesanan gagal dikirim.");
    showStatus(`Pesanan berhasil dikirim. Nomor order: ${result.orderCode}`, "success");
    form.reset();
    qtyInput.value = "1";
    dpInput.value = "0";
    updateSummary();
  } catch (error) {
    showStatus(error.message || "Pesanan belum dapat dikirim. Periksa koneksi dan konfigurasi backend.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Kirim Pesanan <span aria-hidden="true">→</span>';
  }
});
