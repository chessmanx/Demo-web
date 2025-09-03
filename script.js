// Navigation section switching
// --- Teachable Machine Model Integration ---
// The base URL for loading your Teachable Machine model.  If you have exported
// the model and placed the files in a local folder called `my_model` (e.g.
// `my_model/model.json`, `my_model/metadata.json` and `my_model/weights.bin`)
// this should be set to `./my_model/` so that the app loads the local files.
// If you prefer to load directly from Teachable Machine’s hosted model, you can
// instead set this to `https://teachablemachine.withgoogle.com/models/lIl4jvqJI/`.
//
// NOTE: the trailing slash is important because the loader will append
// `model.json` and `metadata.json` to whatever string is provided.
const tmModelURL = "./my_model/";
let tmModel, tmLabels;

async function loadTMModel() {
    if (window.tmImage) {
        tmModel = await tmImage.load(tmModelURL + "model.json", tmModelURL + "metadata.json");
        tmLabels = tmModel.getClassLabels();
    }
}
loadTMModel();

document.addEventListener('DOMContentLoaded', () => {
    function showSection(sectionId) {
        document.querySelectorAll('.section-content').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(sectionId).classList.remove('hidden');
        if (window.innerWidth < 768) {
            document.getElementById('mobileMenu').classList.add('hidden');
        }
    }

    window.showSection = showSection;

    window.toggleMobileMenu = function() {
        const menu = document.getElementById('mobileMenu');
        menu.classList.toggle('hidden');
    };

    // Upload area drag & drop + camera + remove/change
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const cameraInput = document.getElementById('cameraInput');
    const cameraModal = document.getElementById('cameraModal');
    const cameraVideo = document.getElementById('cameraVideo');
    const captureBtn = document.getElementById('captureBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    const cameraCanvas = document.getElementById('cameraCanvas');
    let cameraStream = null;
    const uploadContent = document.getElementById('uploadContent');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const chooseFileBtn = document.getElementById('chooseFileBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const removeImgBtn = document.getElementById('removeImgBtn');

    if (uploadArea && fileInput && cameraInput && uploadContent && imagePreview && previewImg) {
        // Click to choose file (open file picker)
        if (chooseFileBtn) {
            chooseFileBtn.addEventListener('click', e => {
                e.stopPropagation();
                fileInput.value = '';
                fileInput.click();
            });
        }
        // Click to open camera (open camera modal)
        if (cameraBtn) {
            cameraBtn.addEventListener('click', async e => {
                e.stopPropagation();
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert('เบราว์เซอร์ของคุณไม่รองรับการเปิดกล้อง');
                    return;
                }
                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    cameraVideo.srcObject = cameraStream;
                    cameraModal.classList.remove('hidden');
                } catch (err) {
                    alert('ไม่สามารถเข้าถึงกล้องได้ หรือคุณไม่ได้อนุญาต');
                }
            });
        }

        // Capture photo from camera
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                if (!cameraVideo.srcObject) return;
                const width = cameraVideo.videoWidth;
                const height = cameraVideo.videoHeight;
                cameraCanvas.width = width;
                cameraCanvas.height = height;
                const ctx = cameraCanvas.getContext('2d');
                ctx.drawImage(cameraVideo, 0, 0, width, height);
                cameraCanvas.toBlob(blob => {
                    if (blob) handleFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
                }, 'image/jpeg');
                stopCamera();
                cameraModal.classList.add('hidden');
            });
        }
        if (closeCameraBtn) {
            closeCameraBtn.addEventListener('click', () => {
                stopCamera();
                cameraModal.classList.add('hidden');
            });
        }

        // Drag & drop
        uploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', e => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        // File input
        fileInput.addEventListener('change', e => {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });
        // Camera input
        cameraInput.addEventListener('change', e => {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });
        // Remove/change image
        removeImgBtn && removeImgBtn.addEventListener('click', () => {
            previewImg.src = '';
            imagePreview.classList.add('hidden');
            uploadContent.classList.remove('hidden');
            fileInput.value = '';
            cameraInput.value = '';
        });
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        if (cameraVideo) cameraVideo.srcObject = null;
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = e => {
            previewImg.src = e.target.result;
            uploadContent.classList.add('hidden');
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }


    // Helpers: convert data URL / image element to Blob
    async function imageElementToBlob(img) {
        // fetch works with data: and blob: URLs in modern browsers
        const res = await fetch(img.src);
        return await res.blob();
    }

    function updateUIWithResult(className, score) {
        document.getElementById('fabricType').textContent = className;
        document.getElementById('accuracy').textContent = (score * 100).toFixed(1) + '%';
        document.getElementById('analysisResult').classList.remove('hidden');
        // region hint for specific patterns
        if (className === 'ลายกาบบัวจก' || className === 'ลายกาบบัวธรรมดา') {
            const region = document.getElementById('region');
            if (region) region.textContent = 'อุบลราชธานี';
        }
        // more button
        const moreBtnId = 'ubon-more-btn';
        let moreBtn = document.getElementById(moreBtnId);
        if (className === 'ลายกาบบัวธรรมดา' || className === 'ลายกาบบัวจก') {
            if (!moreBtn) {
                moreBtn = document.createElement('a');
                moreBtn.id = moreBtnId;
                moreBtn.href = 'sector/Northeast/ubon.html';
                moreBtn.target = '_blank';
                moreBtn.className = 'mt-4 inline-block bg-thai-gold hover:bg-yellow-500 text-thai-blue px-4 py-2 rounded-lg font-medium transition-colors';
                moreBtn.textContent = '📖 อ่านต่อเกี่ยวกับลายนี้';
                const desc = document.getElementById('fabricDescription');
                if (desc) desc.parentNode.appendChild(moreBtn);
            } else {
                moreBtn.style.display = '';
            }
        } else if (moreBtn) {
            moreBtn.style.display = 'none';
        }
    }

    // Analyze image using the local Teachable Machine model only (client-side)
    window.analyzeImage = async function() {
        const img = document.getElementById('previewImg');
        if (!img || !img.src || img.src === window.location.href || img.src === 'about:blank') {
            alert('กรุณาอัปโหลดหรือถ่ายภาพก่อนวิเคราะห์');
            return;
        }
        if (!(img.src.startsWith('data:') || img.src.startsWith('blob:') || img.src.startsWith('file:'))) {
            alert('รูปภาพไม่ถูกต้อง กรุณาอัปโหลดใหม่');
            return;
        }

        if (!window.tmImage) {
            alert('ไลบรารี Teachable Machine ไม่ถูกโหลด กรุณารีเฟรชหน้า');
            return;
        }

        if (!tmModel) {
            // Try loading the model now if it wasn't loaded earlier
            try {
                await loadTMModel();
            } catch (err) {
                console.error('Failed to load local TM model:', err);
            }
        }

        if (!tmModel) {
            alert('ไม่พบโมเดลในเครื่อง (my_model) — กรุณาตรวจสอบไฟล์ my_model และรีเฟรชหน้า');
            return;
        }

        try {
            const prediction = await tmModel.predict(img);
            const best = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
            updateUIWithResult(best.className, best.probability);
            console.log('Local TM prediction:', best);
        } catch (err) {
            console.error('Local TM prediction failed:', err);
            alert('เกิดข้อผิดพลาดในการทำนายบนเครื่องลูกข่าย: ' + (err.message || err));
        }
    };

    // Show fabric detail (mock)
    window.showFabricDetail = function(type) {
        alert('รายละเอียดผ้า: ' + type);
    };

    // Show more fabric details (mock)
    window.showFabricDetails = function() {
        alert('ข้อมูลเพิ่มเติมเกี่ยวกับผ้าชนิดนี้');
    };
});
