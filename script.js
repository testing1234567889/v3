// script.js
function bukaTab(tabId) {
  document.querySelectorAll('.tab-buttons button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "Accept": "application/json"
};
const NAME = "wibu";
const PROFILE = "https://lh3.googleusercontent.com/a/ACg8ocIk6mQVP02KEycB9_MYhhtyiN8eyDaz_N3dp3OwwIDN30ri0XYS=s288-c-no";

function vipDate(epoch) {
  if (!epoch || epoch == 0) return "-";
  return new Date(epoch * 1000).toLocaleString();
}

async function login(email) {
  const payload = { user: NAME, email: email, profil: PROFILE };
  const res = await fetch("https://apps.animekita.org/api/v1.1.6/model/login.php", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!json.data || !json.data[0]) throw new Error("Login gagal atau data tidak ditemukan.");
  return json.data[0].token;
}

async function getData(token) {
  const res = await fetch("https://apps.animekita.org/api/v1.1.6/model/app-config.php", {
    method: "POST",
    headers,
    body: JSON.stringify({ token })
  });
  const json = await res.json();
  return json.data[0];
}

async function prosesVip() {
  const email = document.getElementById('emailAktivasi').value.trim();
  const vipCode = document.getElementById('durasi').value;
  const result = document.getElementById('hasilAktivasi');

  if (!email) {
    result.innerHTML = '<span style="color:red">❌ Email tidak boleh kosong!</span>';
    return;
  }

  result.innerHTML = '🔄 Login...';

  try {
    const token = await login(email);
    const before = await getData(token);
    result.innerHTML = buatTabelStatus(before, 'Sebelum Aktivasi');

    await setPremium(token, vipCode);
    const after = await getData(token);
    result.innerHTML += buatTabelStatus(after, 'Setelah Aktivasi');
  } catch (err) {
    result.innerHTML = '<span style="color:red">❌ ' + err.message + '</span>';
  }
}

async function setPremium(token, vipCode) {
  const res = await fetch("https://apps.animekita.org/api/v1.1.6/model/vip.php", {
    method: "POST",
    headers,
    body: new URLSearchParams({ token, vip: vipCode })
  });
  const json = await res.json();
  if (json.status !== "success" && json.status !== 1) throw new Error("Gagal aktivasi VIP.");
  return json;
}

async function cekStatus() {
  const email = document.getElementById('emailStatus').value.trim();
  const result = document.getElementById('hasilStatus');
  if (!email) {
    result.innerHTML = '<span style="color:red">❌ Email tidak boleh kosong!</span>';
    return;
  }

  result.innerHTML = '🔄 Mengecek status...';
  try {
    const token = await login(email);
    const data = await getData(token);
    result.innerHTML = buatTabelStatus(data, 'Status Pengguna');
  } catch (err) {
    result.innerHTML = '<span style="color:red">❌ ' + err.message + '</span>';
  }
}

function buatTabelStatus(data, judul) {
  return `
    <h4>${judul}</h4>
    <table>
      <tr><th>Level</th><td>${data.level}</td></tr>
      <tr><th>Rank</th><td>${data.rank}</td></tr>
      <tr><th>VIP Level</th><td>${data.vipLevel}</td></tr>
      <tr><th>Kadaluarsa VIP</th><td>${vipDate(data.vipExp)}</td></tr>
    </table>
  `;
}

function salinStatus() {
  const teks = document.getElementById('hasilStatus').innerText;
  navigator.clipboard.writeText(teks).then(() => {
    alert('📋 Status berhasil disalin!');
  }).catch(err => {
    alert('❌ Gagal menyalin: ' + err);
  });
}


async function cekTokenFirebase() {
  const token = document.getElementById('tokenInput').value.trim();
  const result = document.getElementById('hasilLogin');

  if (!token) {
    result.innerHTML = '<span style="color:red">❌ Token tidak boleh kosong</span>';
    return;
  }

  result.innerHTML = '🔄 Memvalidasi token...';

  try {
    const doc = await db.collection("tokens").doc(token).get();
    if (!doc.exists) throw new Error("Token tidak ditemukan");

    const data = doc.data();
    const now = Math.floor(Date.now() / 1000);

    if (!data.aktif) throw new Error("Token tidak aktif");
    if (data.vipExp < now) throw new Error("Token sudah kedaluwarsa");

    localStorage.setItem("vipToken", token);
    localStorage.setItem("vipExp", data.vipExp);
    localStorage.setItem("vipLevel", data.vipLevel);

    result.innerHTML = `<span style="color:green">✅ Selamat datang VIP Level ${data.vipLevel}</span>`;
    bukaTab('aktivasi');
  } catch (err) {
    result.innerHTML = '<span style="color:red">❌ ' + err.message + '</span>';
  }
}

function logoutVIP() {
  localStorage.removeItem("vipToken");
  localStorage.removeItem("vipExp");
  localStorage.removeItem("vipLevel");
  alert("🚪 Kamu telah logout dari token VIP.");
  bukaTab('loginToken');
}

function isTokenAktif() {
  const token = localStorage.getItem("vipToken");
  const exp = parseInt(localStorage.getItem("vipExp") || 0, 10);
  const now = Math.floor(Date.now() / 1000);
  return token && now < exp;
}

// MODIFIKASI prosesVip
const oldProsesVip = prosesVip;
prosesVip = async function () {
  if (!isTokenAktif()) {
    alert("⛔ Token tidak aktif atau sudah kedaluwarsa.");
    bukaTab('loginToken');
    return;
  }
  await oldProsesVip();
};




// Sembunyikan tombol aktivasi & status kalau belum login token
function aturTampilanAwal() {
  const vipAktif = isTokenAktif();
  document.getElementById("btnAktivasi").style.display = vipAktif ? "inline-block" : "none";
  document.getElementById("btnStatus").style.display = vipAktif ? "inline-block" : "none";

  if (!vipAktif) {
    bukaTab("loginToken");
  } else {
    bukaTab("aktivasi");
  }
}

// Perbarui tampilan setelah login token berhasil
function selesaiLoginToken() {
  document.getElementById("btnAktivasi").style.display = "inline-block";
  document.getElementById("btnStatus").style.display = "inline-block";
  bukaTab("aktivasi");
}

// Tambahkan pemanggilan selesaiLoginToken di akhir validasi token
const oldCekTokenFirebase = cekTokenFirebase;
cekTokenFirebase = async function () {
  await oldCekTokenFirebase();
  if (isTokenAktif()) selesaiLoginToken();
};

// Ubah juga logout supaya sembunyikan tombol lain
const oldLogout = logoutVIP;
logoutVIP = function () {
  oldLogout();
  document.getElementById("btnAktivasi").style.display = "none";
  document.getElementById("btnStatus").style.display = "none";
};
