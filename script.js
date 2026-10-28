
const form = document.getElementById("orderForm");
const namaInput = document.getElementById("nama");
const whatsappInput = document.getElementById("whatsapp");
const dpInput = document.getElementById("dp");
const variantList = document.getElementById("variantList");
const totalQtyElement = document.getElementById("totalQty");
const totalPriceElement = document.getElementById("totalPrice");
const dpSummaryElement = document.getElementById("dpSummary");
const remainingPriceElement = document.getElementById("remainingPrice");
const statusMessage = document.getElementById("statusMessage");
const submitButton = document.getElementById("submitButton");

const VARIANTS = ["Oreo", "Matcha"];

const rupiah = (number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);

document.getElementById("year").textContent =
  new Date().getFullYear();

function renderVariants() {
  variantList.innerHTML = VARIANTS.map((variant, index) => `
    <div class="variant-row">
      <div>
        <label for="variant-${index}">${variant}</label>
        <small class="field-help">Jumlah ${variant}</small>
      </div>
      <input
        class="variant-qty"
        id="variant-${index}"
        type="number"
        min="0"
        step="1"
        value="0"
        data-variant="${variant}"
        aria-label="Jumlah ${variant}"
      >
    </div>
  `).join("");

  document.querySelectorAll(".variant-qty").forEach((input) => {
    input.addEventListener("input", updateSummary);
  });
}

function getSelectedItems() {
  return Array.from(document.querySelectorAll(".variant-qty"))
    .map((input) => ({
      nama: input.dataset.variant,
      qty: Number(input.value)
    }))
    .filter((item) => item.qty > 0);
}

function getAmounts() {
  const items = getSelectedItems();
  const qty = items.reduce((sum, item) => sum + item.qty, 0);
  const total = qty * Number(CONFIG.UNIT_PRICE);
  const dp = Math.max(0, Number(dpInput.value) || 0);

  return { items, qty, total, dp };
}

function updateSummary() {
  const { qty, total, dp } = getAmounts();

  totalQtyElement.textContent = `${qty} pcs`;
  totalPriceElement.textContent = rupiah(total);
  dpSummaryElement.textContent = rupiah(dp);
  remainingPriceElement.textContent =
    rupiah(Math.max(0, total - dp));
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

dpInput.addEventListener("input", updateSummary);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus("");

  try {
    const nama = namaInput.value.trim();
    const whatsapp = whatsappInput.value
      .trim()
      .replace(/[\s()-]/g, "");

    const { items, qty, total, dp } = getAmounts();

    if (!nama) {
      throw new Error("Nama lengkap wajib diisi.");
    }

    if (!/^\+?[0-9]{9,16}$/.test(whatsapp)) {
      throw new Error("Nomor WhatsApp harus berisi 9–16 digit angka.");
    }

    if (items.length === 0 || qty < 1) {
      throw new Error("Pilih minimal satu varian.");
    }

    if (items.some((item) =>
      !Number.isInteger(item.qty) || item.qty < 1
    )) {
      throw new Error("Jumlah varian harus berupa bilangan bulat.");
    }

    if (dp > total) {
      throw new Error("DP tidak boleh melebihi perkiraan total harga.");
    }

    const data = {
      action: "create_order",
      nama,
      whatsapp,
      items,
      dp
    };

    submitButton.disabled = true;
    submitButton.textContent = "Memproses pesanan...";
    showStatus("Sedang menyimpan pesanan...");

    const response = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data),
      redirect: "follow"
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message || "Pesanan gagal disimpan."
      );
    }

    showStatus(
      `Pesanan berhasil disimpan! Kode pesanan: ${result.kodeOrder || "-"}`
    );

    form.reset();

    document.querySelectorAll(".variant-qty").forEach((input) => {
      input.value = "0";
    });

    dpInput.value = "0";
    updateSummary();

  } catch (error) {
    console.error("Kesalahan pesanan:", error);

    showStatus(
      "Pesanan belum dapat dipastikan tersimpan. " +
      "Silakan coba lagi. Detail: " +
      (error.message || "Koneksi gagal."),
      true
    );

  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML =
      'Kirim Pesanan <span aria-hidden="true">→</span>';
  }
});

renderVariants();
updateSummary();
