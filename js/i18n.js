// Display translations only. Account data and Indonesian storage keys stay unchanged.
(function () {
  const EN = {
    'nama@email.com': 'you@example.com',
    'Belum ada catatan': 'No records yet',
    '＋ Tambah kategori pengeluaran': '＋ Add expense category',
    '＋ Tambah kategori pemasukan': '＋ Add income category',
    '🧾 Input via Struk': '🧾 Record from a receipt',
    'Contoh': 'Examples',
    'Cek pengeluaran bulan ini': 'Check my expenses',
    'Saran hemat': 'Saving tips',
    'Bandingkan bulan lalu': 'Compare last month',
    'Kategori terbesar': 'Top categories',
    'Makan keluarga di luar': 'Dining out',
    'Belum ada tagihan rutin. Centang "Jadikan tagihan rutin" pas nambah pengeluaran (kost, cicilan, langganan).': 'No recurring bills yet. Select "Make recurring" when adding an expense such as rent, instalments or subscriptions.',
    'Akses 7 Hari · sekali bayar': '7-day access · one-time payment',
    'Pro 30 Hari · berulang otomatis': 'Monthly Pro · auto-renewing',
    'Pro 1 Tahun · berulang otomatis': 'Yearly Pro · auto-renewing',
    'Memuat paket…': 'Loading plans…', 'Pulihkan pembelian': 'Restore purchases',
    'Unduh backup data': 'Export data backup', 'Keluar akun': 'Sign out',
    'Kelola langganan di Google Play': 'Manage subscription in Google Play',
    'Paket belum tersedia untuk akun penguji ini.': 'Plans are not available for this tester account.',
    '30 hari dan 1 tahun ditagih otomatis setiap periode sampai dibatalkan. Kelola langganan Google Play kapan saja. Paket 7 hari hanya dibayar sekali.': 'Monthly and yearly subscriptions renew automatically until cancelled. Manage your subscription in Google Play anytime. The 7-day pass is a one-time payment.',
    '30 hari dan 1 tahun ditagih otomatis setiap periode sampai dibatalkan. Kelola langganan Google Play kapan saja. Uji coba gratis hanya untuk pelanggan baru; batalkan sebelum uji coba berakhir agar tidak ditagih.': 'Monthly and yearly subscriptions renew automatically until cancelled. Manage your subscription in Google Play anytime. The free trial is for new subscribers only; cancel before it ends to avoid being charged.',
    'Pengaturan dompet': 'Wallet settings', 'Mata uang dompet': 'Wallet currency',
    'Pilih mata uang dompet pertama': 'Choose your first wallet currency',
    'Opsi lanjutan': 'Advanced options', 'Catat': 'Record',

    'Menyiapkan akun dan catatan keuangan…': 'Preparing your account and financial records…',
    'Muat ulang jika koneksi terputus': 'Reload if the connection was interrupted',
    'Catet dulu, biar beneran ber-uang': 'Know your money. Build your future.',
    'Masuk': 'Sign in', 'Daftar': 'Sign up', 'Buat Akun': 'Create account', 'Selesai': 'Done',
    'Lupa password?': 'Forgot password?', 'Login dengan Google': 'Continue with Google',
    'Password (min. 6 karakter)': 'Password (at least 6 characters)', 'Konfirmasi Password': 'Confirm password',
    'atau': 'or', 'Akun': 'Account', 'Bahasa': 'Language', 'Mata uang akun': 'Account currency',
    'Tampilan lebih solid': 'Reduce transparency', 'Pengaturan akun': 'Account settings', 'Bahasa & Mata Uang': 'Language & Currency',
    'Gunakan akun yang sama untuk menyinkronkan catatan antarperangkat': 'Use the same account to sync your records across devices',
    'Uji coba gratis 2 hari, sudah termasuk AI (5 pertanyaan/hari). Harga paket ditampilkan oleh Google Play.': '2-day free trial, AI included (5 questions per day). Plan prices are shown by Google Play.',
    'Mata uang digunakan untuk semua catatan akun ini. Setelah ada data keuangan, mata uang terkunci agar nilai lama tidak berubah.': 'One currency is used for all records in this account. It locks after financial data is saved to keep existing amounts accurate.',
    'Bahasa mengikuti akun di semua perangkat. Tampilan solid hanya untuk perangkat ini.': 'Language syncs across your account. Reduced transparency applies only to this device.',
    'Memeriksa sinkronisasi…': 'Checking sync…', 'Ringkasan': 'Overview', 'Transaksi': 'Transactions',
    'Tambah': 'Add', 'Rencana': 'Plans', 'Laporan': 'Reports', 'Paket Pro': 'Pro plans',
    'Paket & pembayaran': 'Plans & payments', 'Ubah Dana Awal': 'Edit opening balance',
    'Hubungkan Telegram (catat via chat)': 'Connect Telegram (record by chat)', 'Atur Kategori': 'Manage categories',
    'Unduh Cadangan': 'Download backup', 'Pulihkan Cadangan': 'Restore backup',
    'Privasi & Bantuan': 'Privacy & help', 'Syarat & Ketentuan': 'Terms & conditions',
    'Bersihkan Cache & Muat Ulang': 'Clear cache & reload', 'Reset Data & Mulai Ulang': 'Reset data & start again',
    'Hapus Akun Ruvy': 'Delete Ruvy account', 'Logout': 'Sign out',
    'Hapus akun Ruvy dan data terkait': 'Delete your Ruvy account and related data',
    'Paksa ambil versi terbaru tanpa menghapus catatan akun': 'Reload the latest version without deleting account records',
    'Hapus semua data & mulai dari awal': 'Delete all data and start again',
    'Pilih Paket Langganan': 'Choose a subscription', 'Pilih paket untuk memakai fitur Pro.': 'Choose a plan to use Pro features.',
    'Kembali ke Dashboard': 'Back to overview', 'Lihat Dashboard Dulu': 'View overview',
    'Pilih 7 Hari': 'Choose 7 days', 'Pilih Bulanan': 'Choose monthly', 'Pilih Tahunan': 'Choose yearly',
    'Akses 7 Hari': '7-day access', 'Akses 30 Hari': '30-day access', 'Akses 1 Tahun': '1-year access',
    'Bulanan': 'Monthly', 'Tahunan': 'Yearly', 'Harian': 'Daily', 'Mingguan': 'Weekly',
    'HEMAT 50%': 'SAVE 50%', '/ 7 hari': '/ 7 days', '/ bulan': '/ month', '/ tahun': '/ year',
    'Beli Sekarang →': 'Subscribe now →', 'Simpan': 'Save', 'Batal': 'Cancel', 'Tutup': 'Close',
    'Hapus': 'Delete', 'Edit': 'Edit', 'Kembali ke Ringkasan': 'Back to overview',
    'Hari ini': 'Today', 'Kemarin': 'Yesterday', 'Minggu': 'Week', 'Bulan': 'Month', 'Tahun': 'Year',
    'Pilih Bulan': 'Choose month', 'Pilih Tahun': 'Choose year', 'Pilih bulan': 'Choose month', 'Pilih tahun': 'Choose year',
    'Semua bulan': 'All months', 'Semua tahun': 'All years', 'Semua': 'All', 'Semua Jenis': 'All types', 'Semua jenis': 'All types',
    'Pemasukan': 'Income', 'Pengeluaran': 'Expenses', 'Saldo Awal': 'Opening balance',
    // Canonical transaction values are stored in Indonesian; translate their display only.
    'pemasukan': 'Income', 'pengeluaran': 'Expense',
    'Sisa Saldo': 'Available balance', 'Saldo bersih': 'Net balance', 'SISA SALDO': 'AVAILABLE BALANCE',
    'TOTAL PEMASUKAN': 'TOTAL INCOME', 'TOTAL PENGELUARAN': 'TOTAL EXPENSES', 'TOTAL TRANSAKSI': 'TRANSACTIONS',
    'Ringkasan Bulan Ini': 'This month at a glance', 'Riwayat Keuangan Sejak Awal': 'Financial history',
    'Pemasukan Bulan Ini vs Lalu': 'Income: this month vs last month',
    'Pengeluaran Bulan Ini vs Lalu': 'Expenses: this month vs last month',
    'Grafik Pengeluaran Harian': 'Daily expenses', 'Top Pemasukan': 'Top income', 'Top Pengeluaran': 'Top expenses',
    'Alokasi 50 / 30 / 20': '50 / 30 / 20 allocation', 'Alokasi Pengeluaran': 'Expense allocation',
    'Alokasi pengeluaran': 'Expense allocation', 'Alokasi Kategori Pengeluaran': 'Expense category allocation',
    'Alokasi kategori pengeluaran': 'Expense category allocation', 'Alokasi': 'Allocation', 'Alokasi…': 'Allocation…',
    'Kebutuhan': 'Needs', 'Keinginan': 'Wants', 'Investasi': 'Investments',
    'KEBUTUHAN': 'NEEDS', 'KEINGINAN': 'WANTS', 'INVESTASI': 'INVESTMENTS',
    'dari 50% Kebutuhan': 'of the 50% needs allocation', 'dari 30% Keinginan': 'of the 30% wants allocation',
    'dari 20% Investasi': 'of the 20% investment allocation', '% Budget Yang Digunakan': '% of budget used',
    'Target pengeluaran bulan ini:': 'Expense target this month:', 'Target (Rp)': 'Target amount',
    'Target disimpan': 'Target saved', 'Ubah target:': 'Edit target:',
    'Lihat analisis lengkap': 'View full analysis', 'Sembunyikan analisis lengkap': 'Hide full analysis',
    'Mulai dari satu transaksi': 'Start with one transaction', 'Catat transaksi pertama': 'Record your first transaction',
    'Catat pemasukan atau pengeluaran pertama agar ringkasan keuanganmu mulai terbentuk.': 'Record your first income or expense to build your financial overview.',
    'Mulai di sini': 'Start here', 'Setup dana awal': 'Set your opening balance',
    'Langkah pertama: setup dana awal': 'First step: set your opening balance', 'Setup sekarang →': 'Set up now →',
    'Masukkan saldo rekening, e-wallet, dan tunai agar ringkasanmu akurat. Kamu belum bisa mencatat transaksi sebelum memilih saldo atau Rp0.': 'Add your bank, wallet and cash balances for an accurate overview. Set a balance or explicitly start from zero before recording transactions.',
    'Kenalan dengan Ruvy AI': 'Meet your AI money assistant',
    'Susun target menabung dan lihat progresnya.': 'Set savings goals and track your progress.',
    'Lihat ringkasan dan pola pengeluaranmu.': 'See your overview and spending patterns.',
    'PAKET AKUN': 'ACCOUNT PLAN', 'Paket': 'Plan', 'Aktif': 'Active', 'Pro Bulanan': 'Monthly Pro',
    'Pro Tahunan': 'Yearly Pro', 'Uji Coba Gratis': 'Free trial', 'Belum berlangganan': 'No active subscription',
    'Masa aktif habis': 'Access expired', 'Masa aktif berakhir': 'Access expired', 'Masa uji coba aktif': 'Trial active',
    'Paket aktif tanpa tanggal berakhir.': 'Active plan with no expiry date.',
    'Belum ada paket aktif. Pilih paket untuk membuka fitur Pro.': 'No active plan. Choose a plan to unlock Pro features.',
    'Status belum termuat': 'Status not loaded', 'Periksa paket dan pilih cara pembayaran.': 'Check your plan and payment options.',
    'Status akun belum terbaca. Muat ulang sebelum membayar.': 'Account status is not available. Reload before paying.',
    'Status paket belum dapat dibaca. Coba muat ulang sebelum memilih pembayaran.': 'Plan status is not available. Reload before choosing payment.',
    'Status paket belum dapat dibaca. Muat ulang untuk memeriksa akun.': 'Plan status is not available. Reload to check your account.',
    'Masa aktif paket sudah berakhir. Pilih paket untuk lanjut.': 'Your access has expired. Choose a plan to continue.',
    'Lihat pilihan paket Pro': 'View Pro plans', 'Buka fitur paket Pro': 'Unlock Pro features',
    'Ketuk untuk memperpanjang paket': 'Tap to renew your plan', 'hari tersisa': 'days remaining', 'hari terakhir': 'last day',
    'Daftar Transaksi': 'Transactions', 'Detail Transaksi': 'Transaction details',
    'Tanggal': 'Date', 'Deskripsi': 'Description', 'Jenis': 'Type', 'Jumlah': 'Amount', 'Jumlah (Rp)': 'Amount',
    'Nominal': 'Amount', 'Nominal (Rp)': 'Amount', 'Nominal Rp': 'Amount', 'Kategori': 'Category',
    'Sub Kategori': 'Subcategory', 'Subkategori': 'Subcategory', 'Aksi': 'Actions',
    'Cari deskripsi / kategori…': 'Search description / category…', 'Belum ada transaksi': 'No transactions yet',
    'Belum ada transaksi di periode ini': 'No transactions in this period',
    'Belum ada data': 'No data yet', 'Tambah Transaksi': 'Add transaction',
    'Pilih cara mencatat transaksi': 'Choose how to record', 'Catat uang keluar': 'Record an expense', 'Catat uang masuk': 'Record income',
    'Cara tercepat: ketik saja': 'The quickest way: just type', 'Cukup ketik, misalnya "bakso 25rb"': 'Just type, for example "lunch 12.50"',
    'bakso 25rb': 'lunch 12.50', 'bensin 50rb': 'fuel 30', 'gaji 8jt': 'salary 2500',
    'mis. makan siang 35rb': 'e.g. lunch 12.50', 'mis. Bensin Pertamax': 'e.g. fuel', 'nama toko / order': 'store / order name',
    'Kirim': 'Send', 'Jumlah dan kategori dikenali otomatis.': 'Amount and category are detected automatically.',
    'Atau isi manual': 'Or enter manually', 'Foto struk': 'Receipt photo', 'Struk belanja': 'Receipt',
    'OCR Foto Struk': 'Read receipt', 'Tempel teks ATAU upload foto struk (auto OCR).': 'Paste text or upload a receipt photo (OCR).',
    'Ambil Foto': 'Take photo', 'Pilih dari Galeri': 'Choose from gallery', 'atau tempel teks di bawah ↓': 'or paste the text below ↓',
    'Tanggal struk': 'Receipt date', 'Parse Struk': 'Read receipt', 'Simpan Transaksi': 'Save transaction',
    'Koreksi Manual': 'Edit manually', 'Koreksi hasil parse sebelum disimpan.': 'Review detected details before saving.',
    'Hasilnya salah? Klik "Koreksi Manual" untuk edit total/deskripsi/kategori.': 'Incorrect details? Select "Edit manually" to change the amount, description or category.',
    'Edit Transaksi': 'Edit transaction', 'Jadikan tagihan rutin': 'Make a recurring bill',
    'Transaksi disimpan': 'Transaction saved', 'Transaksi ditambahkan': 'Transaction added', 'Transaksi dihapus': 'Transaction deleted',
    'Transaksi diperbarui': 'Transaction updated', 'Struk disimpan': 'Receipt saved',
    'Transaksi + tagihan rutin disimpan 🔁': 'Transaction and recurring bill saved 🔁',
    'Hapus transaksi ini?': 'Delete this transaction?', 'Masukkan total yang valid': 'Enter a valid amount',
    'Memuat mesin OCR (sekali saja, ~3 MB)…': 'Loading receipt reader (once, about 3 MB)…',
    'Memuat data bahasa Indonesia…': 'Loading receipt language data…', 'Membaca teks dari gambar…': 'Reading text from the image…',
    'Tidak berhasil membaca teks. Coba foto yang lebih terang / lurus.': 'No text could be read. Try a brighter, straight photo.',
    '✅ Teks terbaca! Cek / edit lalu klik "Parse Struk".': '✅ Text detected. Review it, then select "Read receipt".',
    'Gagal memuat Tesseract dari CDN. Cek koneksi internet.': 'The receipt reader could not load. Check your internet connection.',
    'Fitur OCR hanya untuk paket Pro.': 'Receipt reading is available with Pro.',
    'Rekap': 'Summary', 'Rekap Harian': 'Daily summary', 'Rekap Keuangan': 'Financial summary',
    'Periode': 'Period', 'Keluar': 'Expenses', 'Sisa': 'Net',
    'Bagikan Laporan': 'Share report', 'Bagikan Laporan Keuangan': 'Share financial report',
    'Akumulasi Semua Data': 'All records', 'Akumulasi semua data': 'All records', 'Bulan dipilih': 'Selected month',
    'Pilih cakupan laporan. Nominal pengeluaran ditampilkan merah dengan tanda minus.': 'Choose the report period. Expenses appear in red with a minus sign.',
    'Gambar': 'Image', 'Laporan Ruvy': 'Ruvy report', 'Laporan Keuangan': 'Financial report',
    'Izinkan pop-up untuk membuat PDF': 'Allow pop-ups to create a PDF',
    'PDF membuka dialog cetak. Pilih “Simpan sebagai PDF”. Gambar berisi ringkasan dan maksimal 20 transaksi; Excel dan PDF berisi seluruh detail.': 'PDF opens the print dialog; choose "Save as PDF". Images show a summary and up to 20 transactions. Excel and PDF include all details.',
    'Menampilkan 20 transaksi terbaru. Detail lengkap tersedia di PDF/Excel.': 'Showing the latest 20 transactions. Full details are available in PDF/Excel.',
    'Unduh rekap bulanan atau akumulasi sebagai PDF, gambar, dan Excel.\n\nFitur laporan hanya untuk paket Pro.': 'Download monthly or all-time reports as PDF, image or Excel.\n\nReport exports are available with Pro.',
    'Kategori & Sub-Kategori': 'Categories & subcategories', 'Kategori Pemasukan': 'Income categories', 'Kategori Pengeluaran': 'Expense categories',
    'Buat kategori': 'Create category', 'Nama kategori baru': 'New category name', 'Nama kategori pemasukan': 'Income category name',
    'Nama kategori pengeluaran': 'Expense category name', 'Sub kategori baru': 'New subcategory',
    'Sub kategori dihapus': 'Subcategory deleted', 'Sub kategori ditambahkan': 'Subcategory added',
    'Kategori Anda': 'Your category', 'Ubah nama': 'Rename', 'Kategori…': 'Category…',
    '＋ Tambah kategori pemasukan': '＋ Add income category', '＋ Tambah kategori pengeluaran': '＋ Add expense category',
    '＋ Buat kategori pemasukan': '＋ Create income category', '＋ Buat kategori pengeluaran': '＋ Create expense category',
    'Kategori pemasukan baru langsung dipilih. Subkategori awalnya “Umum”.': 'The new income category will be selected with the initial "General" subcategory.',
    'Kategori pengeluaran baru langsung dipilih. Subkategori awalnya “Umum”.': 'The new expense category will be selected with the initial "General" subcategory.',
    'Rencana Keuangan': 'Financial plans', 'Atur kewajiban dan tujuan keuangan dalam satu tempat.': 'Manage obligations and financial goals in one place.',
    'Hutang & Piutang': 'Debts & receivables', 'Hutang': 'Debts', 'Utang': 'Debts', 'Piutang': 'Receivables',
    'Hutang (saya pinjam)': 'Debts (I borrowed)', 'Piutang (saya pinjamkan)': 'Receivables (I lent)',
    'Piutang (orang pinjam ke saya)': 'Receivable (someone owes me)', 'Hutang (saya pinjam ke orang)': 'Debt (I owe someone)',
    'Pantau kewajiban, pinjaman, dan jatuh tempo.': 'Track what you owe, what others owe you, and due dates.',
    'Total Piutang': 'Total receivables', 'Total Hutang': 'Total debts', 'Posisi Bersih': 'Net position',
    'Selisih piutang & hutang': 'Receivables minus debts', 'berhutang ke saya': 'owe me', 'saya berhutang': 'I owe',
    'kamu utang ke orang': 'you owe others', 'utang orang ke kamu': 'others owe you', 'Posisi bersih:': 'Net position:',
    'Aktif (belum lunas)': 'Active (unpaid)', 'Sudah lunas': 'Settled', 'Lewat jatuh tempo': 'Overdue',
    'Belum ada catatan hutang/piutang.': 'No debts or receivables yet.', 'Belum ada yang lunas.': 'No settled records yet.',
    '🎉 Tidak ada yang lewat jatuh tempo.': '🎉 No overdue records.', 'Tandai Lunas': 'Mark settled', 'Batal Lunas': 'Undo settlement',
    'Tambah Hutang/Piutang': 'Add debt / receivable', 'Edit Hutang/Piutang': 'Edit debt / receivable',
    'Nama Orang': 'Person’s name', 'Nama orang': 'Person’s name', 'Nama': 'Name', 'Nama dan nominal wajib diisi': 'Name and amount are required',
    'Jatuh Tempo (opsional)': 'Due date (optional)', 'Catatan (opsional)': 'Notes (optional)', 'Pinjam buat bensin, dll': 'What is this loan for?',
    'Andi / Mama / Pak Budi': 'Person’s name', 'Piutang dari': 'Receivable from', 'Utang ke': 'Debt to',
    'jatuh tempo HARI INI': 'due TODAY', 'jatuh tempo': 'due', 'hari lagi': 'days remaining', 'lewat jatuh tempo': 'overdue',
    'Target Keuangan': 'Savings goals', 'Target': 'Goal', '+ Target Baru': '+ New goal', '+ Tambah Target': '+ Add goal',
    'Nama target': 'Goal name', 'Misal: Beli iPhone, DP Rumah, Dana Darurat': 'e.g. a new phone, home deposit, emergency fund',
    'Tenggat': 'Deadline', 'Tabungan saat ini (Rp)': 'Current savings',
    'Susun rencana yang realistis untuk mencapai targetmu.': 'Build a realistic plan to reach your goal.', 'Belum ada target': 'No goals yet',
    'Tagihan Rutin': 'Recurring bills', 'Tagihan rutin': 'Recurring bills', 'Tagihan': 'Bill',
    'Jatuh tempo tiap tanggal': 'Due each month on day', 'Tanggal 31 otomatis memakai hari terakhir pada bulan yang lebih pendek.': 'Day 31 uses the last day in shorter months.',
    'belum bulan ini': 'not recorded this month', '✓ sudah bulan ini': '✓ recorded this month', '+ Tambah': '+ Add',
    'Mulai dengan Dana Awal': 'Start with an opening balance',
    'Total uang tersedia sekarang': 'Total money available now', 'Saldo pembuka pada': 'Opening balance on',
    'Sebelum mencatat transaksi, masukkan uang yang tersedia sekarang supaya saldo awal dan laporanmu akurat.': 'Before recording transactions, enter your available money so your starting balance and reports are accurate.',
    'Perbaiki angka saldo saat pertama mulai memakai Ruvy. Transaksi setelah tanggal setup tetap dihitung seperti biasa.': 'Correct the balance from when you first started Ruvy. Transactions after that date are still counted normally.',
    'Jumlahkan saldo di rekening, e-wallet, dan uang tunai. Jangan masukkan investasi, piutang, atau limit kartu kredit. Dana awal hanya menjadi saldo pembuka, bukan pemasukan di laporan.': 'Add bank balances, wallets and cash. Exclude investments, receivables and credit limits. This is an opening balance, not report income.',
    'Ubah saldo saat pertama mulai mencatat. Jangan isi saldo hari ini jika sudah ada transaksi sesudah tanggal tersebut, karena transaksi itu tetap dihitung.': 'Edit the balance from when you first started recording. Do not use today’s balance if later transactions already exist; they are still counted.',
    'Nama panggilan (opsional)': 'Preferred name (optional)', 'Opsional: isi aset, utang, dan tagihan rutin': 'Optional: add assets, debts and recurring bills',
    'Investasi & aset': 'Investments & assets', 'Jenis aset': 'Asset type', 'Ke siapa / keterangan': 'Who / description',
    '+ Tambah aset': '+ Add asset', '+ Tambah piutang': '+ Add receivable', '+ Tambah utang': '+ Add debt',
    'Pengingat tagihan rutin': 'Recurring bill reminders', '+ Tambah pengingat': '+ Add reminder',
    'Disimpan sebagai pengingat belum dibayar; tagihan tidak otomatis dicatat sebagai pengeluaran.': 'Saved as an unpaid reminder. Bills are not automatically recorded as expenses.',
    'Contoh: kost / cicilan': 'e.g. rent / loan repayment', 'Simpan perubahan': 'Save changes', 'Simpan dana awal & lanjutkan': 'Save balance & continue',
    'Saya mulai dari Rp0': 'Start from zero', 'Atur saldo ke Rp0': 'Set balance to zero',
    'Isi nominal atau pilih Rp0. Setelah itu kamu langsung masuk ke Ruvy.': 'Enter an amount or start from zero. Then you can use Ruvy.',
    'Perubahan hanya memperbaiki angka saldo pembuka.': 'This only corrects the opening balance.',
    'Masukkan saldo lebih dari Rp0, atau pilih tombol “Saya mulai dari Rp0”.': 'Enter a balance above zero or choose "Start from zero".',
    'Ubah saldo awal akun ini menjadi Rp0?': 'Set this account’s opening balance to zero?',
    'Dana awal tersimpan. Ruvy siap dipakai.': 'Opening balance saved. You can now use Ruvy.',
    'Aset': 'Assets', 'Aset & Investasi': 'Assets & investments', 'Tunai & Bank': 'Cash & bank',
    'Tanya Ruvy': 'Ask your AI money assistant', 'Tanya Ruvy AI': 'Ask your AI money assistant',
    'Ruvy': 'Ruvy', 'Asisten AI · memahami data keuanganmu': 'AI assistant · insights from your records',
    'Bahasa & Tampilan': 'Language & Appearance',
    'Sapa Ruvy': 'Say hello to Ruvy', 'Tambah transaksi': 'Add transaction', 'Pilih dompet': 'Choose wallet',
    'Bulan laporan': 'Report month', 'Tahun laporan': 'Report year', 'Ringkasan dompet': 'Wallet summary',
    'Asisten keuangan pribadi, di paket berbayar': 'Personal money assistant, available with paid plans',
    'Tanyakan kondisi keuanganmu…': 'Ask about your finances…', 'Coba: "Bulan ini aku boros di mana?"': 'Try: "Where did I spend too much this month?"',
    '💬 Chat 24/7, kapan aja': '💬 Ask questions within your plan’s daily limit',
    '🎯 Prediksi target nabung': '🎯 Savings goal planning', '📊 Analisa kategori otomatis': '📊 Category insights',
    '✨ Saran spending personal': '✨ Insights from your own records', '💎 Pro • 30 query/hari': '💎 Pro • 30 questions/day',
    'AI tersedia di paket berbayar. Harga dan pilihan paket ditampilkan oleh Google Play. Batas penggunaan harian berlaku.': 'AI is available with paid plans. Google Play shows prices and available plans. Daily usage limits apply.',
    'Halo! Saya Ruvy, asisten yang membantu membaca data keuanganmu.\n        Tanyakan pengeluaran, target menabung, atau cara mengatur anggaran.': 'Hi! I’m your AI money assistant. I use your financial records to help you understand spending, savings goals and budgets.',
    'Email atau password salah.': 'Incorrect email or password.', 'Email belum terdaftar. Silakan daftar dulu.': 'This email has no account. Sign up first.',
    'Email sudah terdaftar. Coba login.': 'This email already has an account. Try signing in.',
    'Password salah.': 'Incorrect password.', 'Format email tidak valid.': 'Invalid email address.',
    'Password minimal 6 karakter.': 'Use at least 6 characters for your password.', 'Password konfirmasi tidak cocok.': 'Passwords do not match.',
    'Akun ini dinonaktifkan.': 'This account is disabled.', 'Login Google dibatalkan.': 'Google sign-in was cancelled.',
    'Koneksi internet bermasalah.': 'Check your internet connection.', 'Terlalu banyak percobaan. Coba lagi beberapa menit.': 'Too many attempts. Try again in a few minutes.',
    'Terjadi kesalahan.': 'Something went wrong.', 'Silakan login kembali.': 'Please sign in again.', 'Akun telah berubah.': 'The signed-in account has changed.',
    'Masukkan email di form dulu, lalu klik "Lupa password".': 'Enter your email, then select "Forgot password".',
    'Akun belum dapat dimuat. Periksa koneksi lalu muat ulang. Data yang tersimpan tidak dihapus.': 'Your account could not load. Check your connection and reload. Saved records are not deleted.',
    'Email ini sudah terdaftar dengan metode masuk lain. Gunakan metode yang pernah dipakai agar catatan tetap di akun yang sama.': 'This email uses another sign-in method. Use that method to keep your records in the same account.',
    'Demi keamanan, logout lalu login kembali sebelum menghapus akun.': 'For security, sign out and sign in again before deleting your account.',
    'Penghapusan akun belum dapat dimulai.': 'Account deletion could not start.',
    'Penghapusan akun dan data Ruvy sedang diproses.': 'Your Ruvy account and data are being deleted.',
    'Penghapusan Ruvy sedang diproses. Login bersama untuk produk Berstock lain tetap dipertahankan.': 'Your Ruvy data is being deleted. Your shared sign-in for other Berstock products is preserved.',
    'Penghapusan ini menghapus profil Ruvy, catatan keuangan, koneksi Telegram, dan data AI. Data transaksi pembayaran minimum dapat disimpan untuk rekonsiliasi.\n\nKetik HAPUS AKUN untuk melanjutkan.': 'This deletes your Ruvy profile, financial records, Telegram connection and AI data. Minimum payment records may be kept for reconciliation.\n\nType HAPUS AKUN to continue.',
    'Reset semua data & mulai dari awal?\nSemua transaksi, hutang/piutang, aset, & nama bakal DIHAPUS (gak bisa dibatalin). Cocok kalau tadi cuma coba-coba.': 'Reset all data and start again?\nAll transactions, debts, receivables, assets and your name will be permanently deleted.',
    'Data direset. Yuk setup dari awal 🐻': 'Data reset. Set up your account again 🐻',
    'Data berhasil diimpor': 'Data imported', 'Gagal impor: file tidak valid': 'Import failed: invalid file',
    'Backup semua data Anda ke file JSON.\n\nFitur export hanya untuk paket Pro.': 'Back up your records to a JSON file.\n\nData exports are available with Pro.',
    'Export Data': 'Export data', 'Opsi lanjutan': 'More options', 'Tambah tagihan': 'Add bill',
    'Sambungkan Telegram': 'Connect Telegram', 'Masukin kode dulu bos': 'Enter the code first', 'Kode gak valid': 'Invalid code',
    'Masukin kode baru buat ganti akun Telegram.': 'Enter a new code to switch Telegram accounts.',
    'Telegram tersambung! 🐻': 'Telegram connected! 🐻', 'Gagal menyambung': 'Connection failed', 'Koneksi error, coba lagi': 'Connection error. Try again.',
    'Lagi narik dari Telegram...': 'Loading Telegram records…', 'Chat transaksi atau 📸 kirim foto struk setelah akun terhubung.': 'Send a transaction or receipt photo after connecting your account.',
    'Login dulu ya bos': 'Sign in first', 'User belum login': 'You are not signed in',
    'Install ke Home Screen': 'Add to Home Screen', 'Install ke iPhone': 'Add to iPhone Home Screen',
    'Buat fullscreen mode + login persistent': 'Open as a full-screen app', 'Fullscreen mode + login persistent': 'Open as a full-screen app',
    'bakso 25rb · atau tanya…': 'coffee 4.50 · or ask…', 'Foto struk': 'Receipt photo', 'Bicara': 'Speak',
    'Nanti aja': 'Not now', 'Lainnya': 'More', 'Total': 'Total', 'Total:': 'Total:', 'Tersalin': 'Copied',
    'Januari': 'January', 'Februari': 'February', 'Maret': 'March', 'Mei': 'May', 'Juni': 'June',
    'Juli': 'July', 'Agustus': 'August', 'Oktober': 'October', 'Desember': 'December',
    'Ags': 'Aug', 'Okt': 'Oct', 'Des': 'Dec', 'Min': 'Sun', 'Sen': 'Mon', 'Sel': 'Tue', 'Rab': 'Wed', 'Kam': 'Thu', 'Jum': 'Fri', 'Sab': 'Sat',
    'bulan ini': 'this month', 'bulan lalu': 'last month', 'vs Bulan Lalu': 'vs last month', 'minggu ini': 'this week',
    'Makanan': 'Food', 'Hunian': 'Housing', 'Tabungan & Investasi': 'Savings & investments',
    'Pendidikan & Anak': 'Education & children', 'Belanja Dapur': 'Groceries', 'Konsumsi Makan': 'Dining',
    'Kesehatan': 'Healthcare', 'Transportasi': 'Transport', 'Lifestyle & Self-care': 'Lifestyle & self-care',
    'Hiburan & Rekreasi': 'Entertainment & leisure', 'Internet & Komunikasi': 'Internet & communication',
    'Utang & Pinjaman': 'Debt & loans', 'Gaji & Pendapatan Utama': 'Salary & main income',
    'Investasi/Tabungan': 'Investment income', 'Usaha/Sampingan': 'Business & side income', 'Utang & Piutang': 'Loans & receivables', 'Lain-lain': 'Other',
    'KPR & cicilan mobil': 'Mortgage & vehicle payments', 'Listrik & air': 'Electricity & water', 'Perawatan rumah': 'Home maintenance',
    'Investasi reksa dana/saham': 'Funds & stocks', 'Investasi emas': 'Gold investments',
    'Les privat/kursus': 'Lessons & courses', 'Buku & perlengkapan sekolah': 'Books & school supplies',
    'Belanja bulanan supermarket': 'Supermarket groceries', 'Belanja sayur/lauk/buah': 'Fresh groceries',
    'Makan keluarga di luar': 'Dining out', 'Makan pagi bubur': 'Breakfast', 'Minuman/jajan': 'Drinks & snacks',
    'BPJS/Kesehatan': 'Healthcare & insurance', 'Obat & Apotek': 'Medicine & pharmacy', 'BBM/bensin': 'Fuel',
    'Servis motor/mobil': 'Vehicle maintenance', 'Parkir & Tol': 'Parking & tolls', 'Fashion/pakaian': 'Clothing',
    'Gas/LPG': 'Cooking gas', 'Salon & perawatan': 'Personal care', 'Nonton bioskop/teater': 'Cinema & theatre',
    'Langganan streaming': 'Streaming subscriptions', 'Liburan': 'Travel & holidays', 'Internet & TV kabel': 'Internet & cable',
    'Pulsa & Paket Data': 'Mobile & data', 'Bayar utang': 'Debt repayment', 'Bayar cicilan': 'Loan instalment',
    'Pinjaman keluar': 'Money lent', 'Gaji bulanan': 'Salary', 'Bonus/THR': 'Bonus', 'Komisi afiliasi/digital': 'Affiliate commissions',
    'Dividen saham': 'Dividends', 'Hasil sewa rumah/kos': 'Rental income', 'Bunga tabungan': 'Interest',
    'Pemasukan toko/online shop': 'Business income', 'Hasil freelance': 'Freelance income', 'Pelunasan piutang': 'Loan repaid to me',
    'Pinjaman cair': 'Loan received', 'Transfer masuk': 'Incoming transfer', 'Hadiah': 'Gifts', 'Pengembalian uang': 'Refunds', 'Umum': 'General'
  };

  function language() {
    if (typeof getAppLanguage === 'function') return getAppLanguage();
    try { return localStorage.getItem('beruang_ui_language') === 'en' ? 'en' : 'id'; } catch (_) { return 'id'; }
  }
  function exact(text) {
    const source = String(text == null ? '' : text);
    if (language() !== 'en') return source;
    const normalized = source.replace(/\s+/g, ' ').trim();
    const entry = EN[source] ?? EN[source.trim()] ?? EN[normalized];
    if (entry != null) return source.match(/^\s*/)[0] + entry + source.match(/\s*$/)[0];
    // Preserve decorative icons while translating their authored label.
    const icon = normalized.match(/^([^\p{L}\p{N}<]*)([\p{L}\p{N}].*)$/u);
    if (icon && EN[icon[2]] != null) return icon[1] + EN[icon[2]];
    return source;
  }
  window.t = function (key, params) {
    let output = exact(key);
    if (params) Object.keys(params).forEach(name => { output = output.split('{' + name + '}').join(String(params[name])); });
    return output;
  };
  window.translateUiText = window.t;
  // A tagged template translates only authored static text, never interpolated user data.
  window.ui = function (parts, ...values) {
    const marker = '\uE000BU';
    const authored = parts.join(marker);
    let output;
    if (authored.includes('<')) {
      output = authored.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, segment => segment)
        .split(/(<[^>]*>)/g).map(segment => {
          if (!segment.startsWith('<')) return translateFragment(segment, marker);
          return segment.replace(/\b(title|placeholder|aria-label|data-name-placeholder)=("|')([^"']*)\2/g,
            (match, attr, quote, text) => attr + '=' + quote + translateFragment(text, marker) + quote);
        }).join('');
    } else output = translateFragment(authored, marker);
    return output.split(marker).reduce((result, part, index) => result + (index ? String(values[index - 1] ?? '') : '') + part, '');
  };
  function translateFragment(source, marker) {
    if (language() !== 'en') return source;
    const decoded = source.replace(/&amp;/g, '&');
    const direct = exact(decoded);
    if (direct !== decoded) return direct;
    // Only translate static segments on each side of an opaque interpolation marker.
    return decoded.split(marker).map(segment => {
      const directPart = exact(segment);
      if (directPart !== segment) return directPart;
      const prefixes = {
        'Halo, ': 'Hello, ', 'Rekap ': 'Summary ', 'Minggu ': 'Week ', 'Hutang ': 'Debts ', 'Piutang ': 'Receivables ',
        'Kategori diubah menjadi “': 'Category renamed to “', 'Kategori “': 'Category “', 'Nama baru untuk ': 'New name for ',
        'Hapus catatan "': 'Delete record "', 'Tandai "': 'Mark "', 'Detail transaksi (': 'Transaction details (',
        'Laporan Keuangan · ': 'Financial report · ', 'Laporan Ruvy ': 'Ruvy report ',
        '📅 Paket: ': '📅 Plan: ', '✅ Link reset password sudah dikirim ke ': '✅ Password reset link sent to ',
        'Pembayaran berhasil. Paket ': 'Payment successful. Plan ', '❌ Gagal OCR: ': '❌ Receipt reading failed: '
      };
      const suffixes = {
        ' transaksi': ' transactions', ' target lain': ' more goals', ' lewat jatuh tempo': ' overdue',
        ' hari tersisa': ' days remaining', ' hari lagi': ' days remaining', ' bulan ini': ' this month',
        '% vs Bulan Lalu': '% vs last month', ' · Aktif': ' · Active', ' · Masa aktif berakhir': ' · Access expired',
        '” ditambahkan dan dipilih.': '” added and selected.', '” ditambahkan.': '” added.',
        ') sebagai LUNAS?': ') as settled?', ' transaksi dari Telegram masuk 🐻': ' Telegram transactions received 🐻'
      };
      for (const [key, value] of Object.entries(prefixes)) if (segment.startsWith(key)) return value + segment.slice(key.length);
      for (const [key, value] of Object.entries(suffixes)) if (segment.endsWith(key)) return segment.slice(0, -key.length) + value;
      return segment;
    }).join(marker);
  }
  window.categoryDisplayName = function (name, kind, parentName) {
    const category = parentName ? state?.categories?.[kind]?.[parentName] : state?.categories?.[kind]?.[name];
    if (category?.custom) return String(name || '');
    const original = typeof DEFAULT_CATEGORIES !== 'undefined' ? DEFAULT_CATEGORIES[kind] : null;
    const builtIn = parentName ? original?.[parentName]?.subs?.includes(name) : !!original?.[name];
    return builtIn || name === 'Umum' ? exact(name) : String(name || '');
  };

  const staticNodes = [];
  const staticAttributes = [];
  function registerStaticUI() {
    if (typeof document === 'undefined' || !document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!node.textContent.trim() || node.parentElement?.closest('script,style,textarea,canvas,[data-i18n-skip],[data-currency-label]')) return;
      const source = node.textContent;
      const normalized = source.replace(/\s+/g, ' ').trim().replace(/&amp;/g, '&');
      const decoration = normalized.match(/^([^\p{L}\p{N}<]*)([\p{L}\p{N}].*)$/u);
      if (EN[source] != null || EN[source.trim()] != null || EN[normalized] != null || (decoration && EN[decoration[2]] != null)) staticNodes.push({ node, source });
    });
    document.querySelectorAll('[title],[placeholder],[aria-label]').forEach(node => {
      ['title', 'placeholder', 'aria-label'].forEach(attribute => {
        // Wallet-aware examples are rendered with their current currency.
        if (attribute === 'placeholder' && node.hasAttribute('data-dynamic-placeholder')) return;
        if (node.hasAttribute(attribute)) staticAttributes.push({ node, attribute, source: node.getAttribute(attribute) });
      });
    });
  }
  window.applyAppLanguage = function () {
    if (typeof document === 'undefined') return;
    const lang = language();
    document.documentElement.lang = lang;
    document.title = 'Ruvy - AI Money Tracker';
    if (typeof MONTHS !== 'undefined') for (let i=0;i<12;i++) {
      MONTHS[i]=new Intl.DateTimeFormat(lang==='en'?'en-US':'id-ID',{month:'long'}).format(new Date(2026,i,1));
      MONTHS_SHORT[i]=new Intl.DateTimeFormat(lang==='en'?'en-US':'id-ID',{month:'short'}).format(new Date(2026,i,1));
    }

    staticNodes.forEach(({ node, source }) => { if (node.isConnected) node.textContent = exact(source); });
    staticAttributes.forEach(({ node, attribute, source }) => { if (node.isConnected) node.setAttribute(attribute, exact(source)); });
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = exact(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = exact(node.dataset.i18nPlaceholder); });
    document.querySelectorAll('#login-language,#app-language').forEach(select => { select.value = lang; });
    document.querySelectorAll('[data-label]').forEach(node => { node.dataset.displayLabel = node.dataset.label === 'Masuk' ? (lang === 'en' ? 'Income' : 'Masuk') : exact(node.dataset.label); });
  };
  window.setDeviceLanguage = function (lang) {
    const chosen = lang === 'en' ? 'en' : 'id';
    try { localStorage.setItem('beruang_ui_language', chosen); } catch (_) {}
    if (typeof rememberLoginLanguage === 'function' && (typeof currentUser === 'undefined' || !currentUser)) rememberLoginLanguage(chosen);
    return chosen;
  };
  registerStaticUI();
  applyAppLanguage();
})();
