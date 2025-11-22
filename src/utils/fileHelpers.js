export const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
  
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          const MAX_SIZE_MB = 3;
          let width = img.width;
          let height = img.height;
  
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
  
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
  
          let quality = 0.9;
          let compressedBlob;
  
          const dataURItoBlob = (dataURI) => {
            const byteString = atob(dataURI.split(',')[1]);
            const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            return new Blob([ab], { type: mimeString });
          };
  
          do {
            compressedBlob = dataURItoBlob(canvas.toDataURL('image/jpeg', quality));
            quality -= 0.1;
          } while (compressedBlob.size > MAX_SIZE_MB * 1024 * 1024 && quality > 0.3);
  
          if (compressedBlob.size > MAX_SIZE_MB * 1024 * 1024) {
            reject(new Error(`O arquivo ainda é maior que ${MAX_SIZE_MB}MB.`));
          } else {
            resolve(compressedBlob);
          }
        };
        img.src = event.target.result;
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };