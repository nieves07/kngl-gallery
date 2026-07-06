// Supabase Bağlantısı
const SUPABASE_URL = 'https://rqtlwqphwfjlysnwkpel.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdGx3cXBod2ZqbHlzbndrcGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDEyNzIsImV4cCI6MjA5ODkxNzI3Mn0.0Xx7BJe0O5VB5uZIZL8LCqOMTTWvSBnGKtGTY6kQGpY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// HTML Elementleri
const galleryGrid = document.getElementById('galleryGrid');
const searchInput = document.getElementById('searchInput');
const loginSection = document.getElementById('loginSection');
const uploadSection = document.getElementById('uploadSection');
const showLoginBtn = document.getElementById('showLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
let selectedFile = null;

// --- 1. GALERİYİ YÜKLEME VE ARAMA ---

async function fetchImages(searchQuery = '') {
    galleryGrid.innerHTML = 'Yükleniyor...';
    let query = supabase.from('gallery_images').select('*').order('created_at', { ascending: false });
    
    if (searchQuery) {
        // Etiketlerde arama yapar (ilike ile büyük/küçük harf duyarsız)
        query = query.ilike('tags', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Hata:', error);
        return;
    }

    galleryGrid.innerHTML = '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.image_url}" alt="Galeri Görseli" loading="lazy">
            <div class="tags">Etiketler: ${item.tags}</div>
        `;
        galleryGrid.appendChild(card);
    });
}

// Arama kutusu tetikleyicisi
searchInput.addEventListener('input', (e) => {
    fetchImages(e.target.value);
});

// --- 2. YETKİLİ GİRİŞ / ÇIKIŞ SİSTEMİ ---

// Sayfa yüklendiğinde oturum açık mı kontrol et
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        uploadSection.style.display = 'block';
        showLoginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        loginSection.style.display = 'none';
    } else {
        uploadSection.style.display = 'none';
        showLoginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    }
}

showLoginBtn.addEventListener('click', () => {
    loginSection.style.display = loginSection.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        document.getElementById('loginError').style.display = 'block';
    } else {
        document.getElementById('loginError').style.display = 'none';
        checkAuth();
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    checkAuth();
});

// --- 3. GÖRSEL YÜKLEME (SÜRÜKLE BIRAK / LİNK) ---

// Sürükle Bırak Olayları
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        selectedFile = e.dataTransfer.files[0];
        dropZone.innerHTML = `Seçilen Dosya: ${selectedFile.name}`;
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        selectedFile = e.target.files[0];
        dropZone.innerHTML = `Seçilen Dosya: ${selectedFile.name}`;
    }
});

// Yükleme Butonu
document.getElementById('uploadBtn').addEventListener('click', async () => {
    const linkInput = document.getElementById('linkInput').value;
    const tags = document.getElementById('tagInput').value;
    const statusText = document.getElementById('uploadStatus');
    
    if (!tags) return alert('Lütfen en az bir etiket girin!');
    if (!selectedFile && !linkInput) return alert('Lütfen bir dosya seçin veya link girin!');

    statusText.innerText = "Yükleniyor...";
    let finalImageUrl = linkInput;

    // Eğer dosya seçildiyse Supabase Storage'a yükle
    if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('gallery')
            .upload(fileName, selectedFile);
            
        if (uploadError) {
            return statusText.innerText = 'Dosya yükleme hatası: ' + uploadError.message;
        }

        // Yüklenen dosyanın public linkini al
        const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName);
        finalImageUrl = publicUrl;
    }

    // Veritabanına kaydet
    const { error: dbError } = await supabase.from('gallery_images').insert([
        { image_url: finalImageUrl, tags: tags }
    ]);

    if (dbError) {
        statusText.innerText = 'Veritabanı hatası: ' + dbError.message;
    } else {
        statusText.innerText = 'Başarıyla yüklendi!';
        document.getElementById('linkInput').value = '';
        document.getElementById('tagInput').value = '';
        selectedFile = null;
        dropZone.innerHTML = 'Dosyayı buraya sürükle-bırak veya seçmek için tıkla';
        fetchImages(); // Galeriyi yenile
    }
});

// Başlangıçta çalışacak fonksiyonlar
checkAuth();
fetchImages();
