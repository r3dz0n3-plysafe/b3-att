import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import Swal from 'sweetalert2';
import { getEAR, getMAR, getEulerAngles, getFaceBounds } from '../lib/faceGeometry.js';
import { uploadFacePhoto } from '../lib/api.js';

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

export default function FaceDetectionView({ authToken, onCapture, onReset, onGotoB3 }) {
  // ==== Structural state (drives conditional rendering) ====
  const [activeMode, setActiveModeState] = useState('webcam');
  const [cameraOn, setCameraOn] = useState(false);
  const [toggleCameraDisabled, setToggleCameraDisabled] = useState(false);
  const [mediapipeLoading, setMediapipeLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Memuat MediaPipe FaceLandmarker...');
  const [uploadedPreviewSrc, setUploadedPreviewSrc] = useState(null);
  const [resizeValue, setResizeValue] = useState('256');
  const [isCroppedUI, setIsCroppedUI] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ==== DOM refs for hot-path (per-frame) updates ====
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const uploadCanvasRef = useRef(null);
  const containerUploadRef = useRef(null);
  const croppedImgRef = useRef(null);
  const blobInfoRef = useRef(null);
  const actionInstrRef = useRef(null);
  const statusBoxRef = useRef(null);
  const valYawRef = useRef(null);
  const valPitchRef = useRef(null);
  const valRollRef = useRef(null);
  const valEarRef = useRef(null);
  const valMarRef = useRef(null);
  const chkFaceRef = useRef(null);
  const chkSizeRef = useRef(null);
  const chkCenterRef = useRef(null);
  const chkPoseRef = useRef(null);
  const chkLivenessRef = useRef(null);

  // ==== Mutable (non-rendering) state ====
  const faceLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const isCroppedRef = useRef(false);
  const currentBase64Ref = useRef('');
  const currentBlobRef = useRef(null);
  const currentLandmarksRef = useRef(null);
  const activeModeRef = useRef('webcam');
  const uploadedImageElementRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const uploadValidationOkRef = useRef(true);
  const uploadRejectReasonsRef = useRef([]);
  const resizeValueRef = useRef('256');

  useEffect(() => {
    resizeValueRef.current = resizeValue;
  }, [resizeValue]);

  function setActiveMode(mode) {
    activeModeRef.current = mode;
    setActiveModeState(mode);
  }

  function setIsCropped(value) {
    isCroppedRef.current = value;
    setIsCroppedUI(value);
  }

  function setUploadStatusBox(isRejected) {
    const statusBox = statusBoxRef.current;
    const instr = actionInstrRef.current;
    if (!statusBox || !instr) return;
    statusBox.classList.remove('bg-blue-50', 'border-blue-200', 'bg-red-50', 'border-red-300', 'bg-green-100', 'border-green-300');
    instr.classList.remove('text-blue-700', 'text-red-600', 'text-green-700');
    if (isRejected) {
      statusBox.classList.add('bg-red-50', 'border-red-300');
      instr.classList.add('text-red-600');
    } else {
      statusBox.classList.add('bg-blue-50', 'border-blue-200');
      instr.classList.add('text-blue-700');
    }
  }

  function updateB3FaceStatus(base64Data) {
    onCapture(base64Data, currentBlobRef.current);
  }

  function processCropFromSource(landmarks, sourceElement, isVideoSource = true) {
    if (isCroppedRef.current) return;
    setIsCropped(true);

    const srcW = isVideoSource ? sourceElement.videoWidth : sourceElement.naturalWidth;
    const srcH = isVideoSource ? sourceElement.videoHeight : sourceElement.naturalHeight;

    const { minX, minY, maxX, maxY } = getFaceBounds(landmarks);

    const faceX = minX * srcW;
    const faceY = minY * srcH;
    const faceW = (maxX - minX) * srcW;
    const faceH = (maxY - minY) * srcH;

    const marginX = faceW * 0.5;
    const marginY = faceH * 0.7;

    const targetW = faceW + marginX * 2;
    const targetH = faceH + marginY * 2;
    const squareSize = Math.max(targetW, targetH);

    const cropX = faceX - (squareSize - faceW) / 2;
    const cropY = faceY - (squareSize - faceH) / 2;

    const clampedX = Math.max(0, cropX);
    const clampedY = Math.max(0, cropY);

    const clampedW = Math.min(srcW - clampedX, squareSize);
    const clampedH = Math.min(srcH - clampedY, squareSize);

    const finalDimension = Math.min(clampedW, clampedH);

    const targetSize = parseInt(resizeValueRef.current, 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.clearRect(0, 0, targetSize, targetSize);
    tempCtx.drawImage(
      sourceElement,
      clampedX, clampedY, finalDimension, finalDimension,
      0, 0, targetSize, targetSize
    );

    currentBase64Ref.current = tempCanvas.toDataURL('image/jpeg', 0.95);
    if (croppedImgRef.current) croppedImgRef.current.src = currentBase64Ref.current;

    tempCanvas.toBlob((blob) => {
      currentBlobRef.current = blob;
      const kbSize = (blob.size / 1024).toFixed(2);
      if (blobInfoRef.current) {
        blobInfoRef.current.innerHTML = `Blob siap: <span class="font-bold text-slate-800">${kbSize} KB</span>`;
      }

      updateB3FaceStatus(currentBase64Ref.current);

      if (actionInstrRef.current) {
        actionInstrRef.current.innerHTML = "Berhasil!<br><span class='text-xs'>Lanjut Absensi B3</span>";
      }
      if (statusBoxRef.current) {
        statusBoxRef.current.classList.replace('bg-blue-50', 'bg-green-100');
        statusBoxRef.current.classList.replace('border-blue-200', 'border-green-300');
      }
      if (actionInstrRef.current) {
        actionInstrRef.current.classList.replace('text-blue-700', 'text-green-700');
      }
    }, 'image/jpeg', 0.95);
  }

  async function predictWebcam() {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (activeModeRef.current !== 'webcam' || !cameraStreamRef.current || !video || !canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    const startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;
      const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numFaces = results.faceLandmarks ? results.faceLandmarks.length : 0;
      if (chkFaceRef.current) chkFaceRef.current.textContent = numFaces === 1 ? '✅' : '❌';

      if (numFaces === 1) {
        const landmarks = results.faceLandmarks[0];
        currentLandmarksRef.current = landmarks;
        const matrix = results.facialTransformationMatrixes[0].data;

        const { minX, minY, maxX, maxY } = getFaceBounds(landmarks);
        ctx.fillStyle = '#00ff00';
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 1, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(minX * canvas.width, minY * canvas.height, (maxX - minX) * canvas.width, (maxY - minY) * canvas.height);

        const pose = getEulerAngles(matrix);
        const ear = getEAR(landmarks);
        const mar = getMAR(landmarks);
        const faceWidthRatio = maxX - minX;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        if (valYawRef.current) valYawRef.current.textContent = pose.yaw.toFixed(1) + '°';
        if (valPitchRef.current) valPitchRef.current.textContent = pose.pitch.toFixed(1) + '°';
        if (valRollRef.current) valRollRef.current.textContent = pose.roll.toFixed(1) + '°';
        if (valEarRef.current) valEarRef.current.textContent = ear.toFixed(3);
        if (valMarRef.current) valMarRef.current.textContent = mar.toFixed(3);

        const isSizeGood = faceWidthRatio > 0.22;
        if (chkSizeRef.current) chkSizeRef.current.textContent = isSizeGood ? '✅' : '❌';

        const isCentered = (centerX > 0.30 && centerX < 0.70) && (centerY > 0.30 && centerY < 0.70);
        if (chkCenterRef.current) chkCenterRef.current.textContent = isCentered ? '✅' : '❌';

        const isStraight = Math.abs(pose.yaw) < 18 && Math.abs(pose.pitch) < 18 && Math.abs(pose.roll) < 18;
        if (chkPoseRef.current) chkPoseRef.current.textContent = isStraight ? '✅' : '❌';

        if (!isCroppedRef.current) {
          if (isSizeGood && isCentered && isStraight) {
            if (actionInstrRef.current) actionInstrRef.current.innerHTML = "Wajah Siap!<br><span class='text-xs'>Tekan Tombol Capture</span>";
            if (chkLivenessRef.current) chkLivenessRef.current.innerHTML = '✅ <span class="text-xs text-slate-500">(Siap)</span>';
          } else {
            if (actionInstrRef.current) actionInstrRef.current.innerHTML = 'Posisikan<br>Wajah';
            if (chkLivenessRef.current) chkLivenessRef.current.textContent = '❌';
          }
        }
      } else {
        currentLandmarksRef.current = null;
        if (chkSizeRef.current) chkSizeRef.current.textContent = '❌';
        if (chkCenterRef.current) chkCenterRef.current.textContent = '❌';
        if (chkPoseRef.current) chkPoseRef.current.textContent = '❌';
        if (chkLivenessRef.current) chkLivenessRef.current.textContent = '❌';
        if (!isCroppedRef.current && actionInstrRef.current) actionInstrRef.current.innerHTML = 'Posisikan<br>Wajah';
      }
    }
    animationFrameIdRef.current = window.requestAnimationFrame(predictWebcam);
  }

  async function processUploadedPhoto(imageElement) {
    const uploadCanvas = uploadCanvasRef.current;
    const containerUpload = containerUploadRef.current;
    if (!uploadCanvas || !containerUpload) return;
    const uploadCtx = uploadCanvas.getContext('2d');
    uploadCanvas.width = containerUpload.clientWidth;
    uploadCanvas.height = containerUpload.clientHeight;
    uploadCtx.clearRect(0, 0, uploadCanvas.width, uploadCanvas.height);

    try {
      const results = faceLandmarkerRef.current.detect(imageElement);
      const numFaces = results.faceLandmarks ? results.faceLandmarks.length : 0;
      if (chkFaceRef.current) chkFaceRef.current.textContent = numFaces === 1 ? '✅' : '❌';

      if (numFaces === 1) {
        const landmarks = results.faceLandmarks[0];
        const { minX, minY, maxX, maxY } = getFaceBounds(landmarks);

        uploadCtx.fillStyle = '#00ff00';
        for (const lm of landmarks) {
          uploadCtx.beginPath();
          uploadCtx.arc(lm.x * uploadCanvas.width, lm.y * uploadCanvas.height, 1.5, 0, 2 * Math.PI);
          uploadCtx.fill();
        }

        const boxMargin = 1.25 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
        const boxX = minX * uploadCanvas.width;
        const boxY = minY * uploadCanvas.height;
        const boxW = (maxX - minX) * uploadCanvas.width;
        const boxH = (maxY - minY) * uploadCanvas.height;

        uploadCtx.strokeStyle = '#3b82f6';
        uploadCtx.lineWidth = 2;
        uploadCtx.strokeRect(boxX - boxMargin, boxY - boxMargin, boxW + boxMargin * 2, boxH + boxMargin * 2);

        const faceWidthRatio = maxX - minX;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const isSizeGood = faceWidthRatio > 0.22;
        const isCentered = (centerX > 0.30 && centerX < 0.70) && (centerY > 0.30 && centerY < 0.70);

        let isStraight = true;
        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes[0]) {
          const pose = getEulerAngles(results.facialTransformationMatrixes[0].data);
          isStraight = Math.abs(pose.yaw) < 18 && Math.abs(pose.pitch) < 18 && Math.abs(pose.roll) < 18;
        }

        if (chkSizeRef.current) chkSizeRef.current.textContent = isSizeGood ? '✅' : '❌';
        if (chkCenterRef.current) chkCenterRef.current.textContent = isCentered ? '✅' : '❌';
        if (chkPoseRef.current) chkPoseRef.current.textContent = isStraight ? '✅' : '❌';

        if (isSizeGood && isCentered && isStraight) {
          currentLandmarksRef.current = landmarks;
          uploadValidationOkRef.current = true;
          uploadRejectReasonsRef.current = [];
          if (chkLivenessRef.current) chkLivenessRef.current.innerHTML = '✅ <span class="text-xs text-slate-500">(Uploaded)</span>';
          setUploadStatusBox(false);
          if (actionInstrRef.current) actionInstrRef.current.innerHTML = "Wajah Valid!<br><span class='text-xs'>Tekan Tombol Capture</span>";
        } else {
          currentLandmarksRef.current = landmarks;
          if (chkLivenessRef.current) chkLivenessRef.current.textContent = '❌';
          const reasons = [];
          if (!isSizeGood) reasons.push('wajah terlalu kecil/jauh');
          if (!isCentered) reasons.push('wajah tidak di tengah');
          if (!isStraight) reasons.push('wajah tidak lurus ke depan');
          uploadValidationOkRef.current = false;
          uploadRejectReasonsRef.current = reasons;
          setUploadStatusBox(true);
          if (actionInstrRef.current) actionInstrRef.current.innerHTML = 'Foto Ditolak<br><span class=\'text-xs\'>' + reasons.join(', ') + '</span>';
        }
      } else {
        currentLandmarksRef.current = null;
        uploadValidationOkRef.current = false;
        uploadRejectReasonsRef.current = ['wajah tidak terdeteksi'];
        if (chkSizeRef.current) chkSizeRef.current.textContent = '❌';
        if (chkCenterRef.current) chkCenterRef.current.textContent = '❌';
        if (chkPoseRef.current) chkPoseRef.current.textContent = '❌';
        if (chkLivenessRef.current) chkLivenessRef.current.textContent = '❌';
        setUploadStatusBox(true);
        if (actionInstrRef.current) actionInstrRef.current.innerHTML = 'Wajah tidak<br>sesuai';
      }
    } catch (err) {
      console.error(err);
      currentLandmarksRef.current = null;
      uploadValidationOkRef.current = false;
      uploadRejectReasonsRef.current = ['gagal memproses foto'];
      setUploadStatusBox(true);
      if (actionInstrRef.current) actionInstrRef.current.textContent = 'Gagal Deteksi';
    }
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    cameraStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', () => predictWebcam(), { once: true });
    }
    setCameraOn(true);
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    const canvas = overlayCanvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    currentLandmarksRef.current = null;
    if (chkFaceRef.current) chkFaceRef.current.textContent = '❌';
    if (chkSizeRef.current) chkSizeRef.current.textContent = '❌';
    if (chkCenterRef.current) chkCenterRef.current.textContent = '❌';
    if (chkPoseRef.current) chkPoseRef.current.textContent = '❌';
    if (chkLivenessRef.current) chkLivenessRef.current.textContent = '❌';
    if (!isCroppedRef.current && actionInstrRef.current) actionInstrRef.current.innerHTML = 'Kamera<br>Nonaktif';
  }

  async function handleToggleCamera() {
    if (cameraOn) {
      stopCamera();
      return;
    }
    setToggleCameraDisabled(true);
    try {
      await startCamera();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal Mengaktifkan Kamera', text: 'Periksa izin akses kamera pada browser Anda.' });
    } finally {
      setToggleCameraDisabled(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function initMediaPipe() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 2,
        });
        if (cancelled) return;
        faceLandmarkerRef.current = landmarker;
        setMediapipeLoading(false);
      } catch (error) {
        if (!cancelled) setLoadingText('Gagal memuat MediaPipe FaceLandmarker.');
      }
    }

    // Suppress TF Lite log, matches original behaviour
    const originalConsoleError = console.error;
    console.error = function (...args) {
      if (typeof args[0] === 'string' && args[0].includes('INFO: Created TensorFlow Lite XNNPACK')) return;
      originalConsoleError.apply(console, args);
    };

    initMediaPipe();

    return () => {
      cancelled = true;
      console.error = originalConsoleError;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleTabWebcam() {
    setActiveMode('webcam');
    if (!isCroppedRef.current) setUploadStatusBox(false);
    try {
      await faceLandmarkerRef.current.setOptions({ runningMode: 'VIDEO' });
    } catch (e) { /* noop */ }
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    predictWebcam();
  }

  async function handleTabUpload() {
    setActiveMode('upload');
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    try {
      await faceLandmarkerRef.current.setOptions({ runningMode: 'IMAGE' });
    } catch (e) { /* noop */ }
    if (uploadedImageElementRef.current) processUploadedPhoto(uploadedImageElementRef.current);
  }

  function resetCropState(triggerRedetect) {
    setIsCropped(false);
    currentLandmarksRef.current = null;
    currentBlobRef.current = null;
    uploadValidationOkRef.current = true;
    uploadRejectReasonsRef.current = [];
    currentBase64Ref.current = '';
    if (croppedImgRef.current) croppedImgRef.current.src = PLACEHOLDER_IMG;
    if (blobInfoRef.current) blobInfoRef.current.innerHTML = 'Belum ada Blob Data';

    onReset();

    setUploadStatusBox(false);
    if (actionInstrRef.current) actionInstrRef.current.innerHTML = 'Posisikan<br>Wajah';

    if (triggerRedetect && activeModeRef.current === 'upload' && uploadedImageElementRef.current) {
      processUploadedPhoto(uploadedImageElementRef.current);
    }
  }

  function handlePhotoUploadChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        uploadedImageElementRef.current = img;
        setUploadedPreviewSrc(event.target.result);
        resetCropState(false);
        await processUploadedPhoto(img);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleCapture() {
    if (isCroppedRef.current) return;
    if (!currentLandmarksRef.current) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Wajah tidak terdeteksi!' });
      return;
    }
    if (activeModeRef.current === 'webcam') {
      processCropFromSource(currentLandmarksRef.current, videoRef.current, true);
      return;
    }
    if (!uploadValidationOkRef.current) {
      Swal.fire({
        icon: 'warning',
        title: 'Kualitas Foto Kurang Ideal',
        html: 'Alasan: ' + uploadRejectReasonsRef.current.join(', ') + '<br><br>Foto ini berisiko ditolak sistem absensi. Tetap lanjutkan?',
        showCancelButton: true,
        confirmButtonText: 'Lanjutkan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#dc2626',
      }).then((result) => {
        if (result.isConfirmed) {
          processCropFromSource(currentLandmarksRef.current, uploadedImageElementRef.current, false);
        }
      });
      return;
    }
    processCropFromSource(currentLandmarksRef.current, uploadedImageElementRef.current, false);
  }

  async function handleSaveProfile() {
    if (!currentBlobRef.current) {
      Swal.fire({ icon: 'warning', title: 'Belum Ada Foto', text: 'Ambil/gunakan foto wajah terlebih dahulu.' });
      return;
    }
    if (!authToken) {
      Swal.fire({ icon: 'warning', title: 'Sesi Tidak Valid', text: 'Silakan login kembali.' });
      return;
    }

    setIsSavingProfile(true);
    try {
      const { ok, rawText } = await uploadFacePhoto(authToken, currentBlobRef.current);
      if (ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Foto berhasil disimpan sebagai Profile Picture.' });
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: rawText });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error API', text: err.toString() });
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div id="view-face" className="glass-panel rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 block border border-slate-200">
      {/* KOLOM KIRI: KAMERA / UPLOAD */}
      <div className="lg:col-span-7 p-4 md:p-6 border-r border-slate-200 bg-white">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-slate-800 hidden md:block">Sumber Wajah</h2>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all ${activeMode === 'webcam' ? 'font-bold bg-white text-blue-600 shadow-sm' : 'font-semibold text-slate-600'}`}
            onClick={handleTabWebcam}
          >
            Kamera (Oncam)
          </button>
          <button
            className={`flex-1 py-2 text-sm rounded-lg transition-all ${activeMode === 'upload' ? 'font-bold bg-white text-blue-600 shadow-sm' : 'font-semibold text-slate-600'}`}
            onClick={handleTabUpload}
          >
            Upload Foto
          </button>
        </div>

        <div className={`relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner mb-4 ${activeMode === 'webcam' ? '' : 'hidden'}`}>
          <video id="webcam" ref={videoRef} className="absolute w-full h-full object-cover" autoPlay muted playsInline />
          <canvas id="overlay" ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full" />

          <button
            type="button"
            className="absolute top-2 right-2 z-20 bg-slate-900/70 hover:bg-slate-900/90 text-white text-xs font-semibold py-1.5 px-3 rounded-lg backdrop-blur transition-all flex items-center gap-1.5 disabled:opacity-60"
            onClick={handleToggleCamera}
            disabled={toggleCameraDisabled}
          >
            {cameraOn ? '📷 Matikan Kamera' : '📷 Nyalakan Kamera'}
          </button>

          {!cameraOn && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18M10.5 5H17a2 2 0 012 2v9.5M6.5 6.5A2 2 0 005 8.5v9A2 2 0 007 19.5h10a2 2 0 001.9-1.35" />
              </svg>
              <span className="text-sm font-medium tracking-wide">Kamera Dimatikan</span>
            </div>
          )}

          {mediapipeLoading && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white transition-opacity duration-300 z-10">
              <svg className="animate-spin h-10 w-10 mb-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm font-medium tracking-wide">{loadingText}</span>
            </div>
          )}
        </div>

        <div ref={containerUploadRef} className={`relative w-full aspect-video bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden shadow-inner mb-4 flex flex-col items-center justify-center p-4 ${activeMode === 'upload' ? '' : 'hidden'}`}>
          <input
            type="file"
            id="photo-upload-input"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUploadChange}
          />
          {!uploadedPreviewSrc && (
            <div className="text-center cursor-pointer" onClick={() => document.getElementById('photo-upload-input').click()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold text-slate-700">Klik untuk Pilih Foto</p>
            </div>
          )}
          {uploadedPreviewSrc && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
              <img src={uploadedPreviewSrc} className="w-full h-full object-contain" alt="Uploaded" />
              <button
                onClick={() => document.getElementById('photo-upload-input').click()}
                className="absolute bottom-3 right-3 bg-slate-800/80 hover:bg-slate-900 text-white text-xs font-semibold py-1.5 px-3 rounded-lg backdrop-blur transition-all z-10"
              >
                Ganti Foto
              </button>
            </div>
          )}
          <canvas ref={uploadCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" />
        </div>

        {/* Metrik Ringkas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <div className="hidden sm:block bg-slate-100 p-2 rounded-lg text-center shadow-sm">
            <p className="text-[10px] text-slate-500 font-bold mb-0.5">YAW</p>
            <p ref={valYawRef} className="text-sm font-bold">0.0°</p>
          </div>
          <div className="hidden sm:block bg-slate-100 p-2 rounded-lg text-center shadow-sm">
            <p className="text-[10px] text-slate-500 font-bold mb-0.5">PITCH</p>
            <p ref={valPitchRef} className="text-sm font-bold">0.0°</p>
          </div>
          <div className="hidden sm:block bg-slate-100 p-2 rounded-lg text-center shadow-sm">
            <p className="text-[10px] text-slate-500 font-bold mb-0.5">ROLL</p>
            <p ref={valRollRef} className="text-sm font-bold">0.0°</p>
          </div>
          <div className="hidden sm:block bg-slate-100 p-2 rounded-lg text-center shadow-sm">
            <p className="text-[10px] text-slate-500 font-bold mb-0.5">EAR</p>
            <p ref={valEarRef} className="text-sm font-bold">0.00</p>
          </div>
          <div className="hidden sm:block bg-slate-100 p-2 rounded-lg text-center shadow-sm">
            <p className="text-[10px] text-slate-500 font-bold mb-0.5">MAR</p>
            <p ref={valMarRef} className="text-sm font-bold">0.00</p>
          </div>
          <div ref={statusBoxRef} className="sm:col-span-1 bg-blue-50 p-2 rounded-lg text-center shadow-sm border border-blue-200 flex flex-col justify-center">
            <p className="text-[10px] text-blue-600 font-bold mb-0.5">STATUS</p>
            <p ref={actionInstrRef} className="text-sm font-bold text-blue-700 leading-tight">Posisikan<br />Wajah</p>
          </div>
        </div>

        {!isCroppedUI && (
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all mb-3 flex items-center justify-center gap-2 shadow-sm" onClick={handleCapture}>
            Capture
          </button>
        )}
        {isCroppedUI && (
          <button className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition-all" onClick={() => resetCropState(true)}>
            Ulangi Deteksi Wajah
          </button>
        )}
      </div>

      {/* KOLOM KANAN: HASIL */}
      <div className="lg:col-span-5 p-6 bg-slate-50 flex flex-col h-full">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-slate-800 hidden md:block">Hasil & Checklist</h2>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 mb-4">
          <h3 className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 md:mb-3">Status Syarat Crop</h3>
          <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
            <li className="flex items-center gap-2"><span ref={chkFaceRef} className="text-lg md:text-xl">❌</span> Hanya ada 1 Wajah</li>
            <li className="flex items-center gap-2"><span ref={chkSizeRef} className="text-lg md:text-xl">❌</span> Ukuran Wajah Cukup</li>
            <li className="flex items-center gap-2"><span ref={chkCenterRef} className="text-lg md:text-xl">❌</span> Posisi Wajah di Tengah</li>
            <li className="flex items-center gap-2"><span ref={chkPoseRef} className="text-lg md:text-xl">❌</span> Lurus Menghadap Depan</li>
            <li className="flex items-center gap-2 font-semibold text-blue-600"><span ref={chkLivenessRef} className="text-lg md:text-xl">❌</span> Kedipkan Mata (Liveness)</li>
          </ul>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Ukuran Hasil Crop:</label>
          <select
            className="w-full bg-white border border-slate-300 text-slate-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={resizeValue}
            onChange={(e) => setResizeValue(e.target.value)}
          >
            <option value="224">224 x 224 Pixel</option>
            <option value="256">256 x 256 Pixel</option>
            <option value="512">512 x 512 Pixel</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-100 p-4 mb-4 min-h-[200px]">
          <img ref={croppedImgRef} src={PLACEHOLDER_IMG} className="w-32 h-32 object-cover rounded-xl shadow-md border-4 border-white transition-all" alt="Hasil Crop" />
          <p ref={blobInfoRef} className="text-slate-500 text-xs mt-3 text-center font-mono">Belum ada Blob Data</p>
        </div>

        {isCroppedUI && (
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? '🔄 Menyimpan...' : '🖼️ Simpan sebagai Profile Picture'}
          </button>
        )}

        {isCroppedUI && (
          <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2" onClick={onGotoB3}>
            Lanjut ke Absensi B3 &rarr;
          </button>
        )}
      </div>
    </div>
  );
}