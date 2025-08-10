document.addEventListener('DOMContentLoaded', () => {
    const imageGallery = document.getElementById('image-gallery')?.querySelector('.mdc-layout-grid__inner');
    const rankingList = document.getElementById('ranking-list');
    const uploadForm = document.getElementById('upload-form');
    const uploadMessage = document.getElementById('upload-message');
    const uploadSection = document.getElementById('upload-section');

    const page = window.location.pathname;

    const fetchStatus = async () => {
        try {
            const statusRes = await fetch('/status');
            const status = await statusRes.json();
            if (status.hasUploaded && uploadSection) {
                uploadSection.innerHTML = `
                    <div class="mdc-card__primary-action">
                        <h2 class="mdc-typography--headline6" style="margin: 16px;">Upload gesperrt</h2>
                        <p class="mdc-typography--body2" style="margin: 16px;">Du hast bereits ein Bild hochgeladen.</p>
                    </div>`;
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    };

    const fetchImages = async () => {
        try {
            const res = await fetch('/images');
            const images = await res.json();
            
            if (imageGallery) {
                imageGallery.innerHTML = '';
                images.forEach(image => {
                    const cell = document.createElement('div');
                    cell.className = 'mdc-layout-grid__cell mdc-layout-grid__cell--span-4-desktop mdc-layout-grid__cell--span-4-tablet mdc-layout-grid__cell--span-12-phone';

                    const card = document.createElement('div');
                    card.className = 'gallery-item mdc-card mdc-card--outlined';
                    card.innerHTML = `
                        <div class="mdc-card__media mdc-card__media--16-9" style="background-image: url('/uploads/${image.filename}')"></div>
                        <div class="mdc-card__primary">
                            <h2 class="mdc-typography--headline6 name">${image.name}</h2>
                            <h3 class="mdc-typography--subtitle2 votes">Stimmen: ${image.votes}</h3>
                        </div>
                        <div class="mdc-card__actions">
                            <button class="vote-btn mdc-button mdc-card__action mdc-card__action--button" data-image="${image.filename}">
                                <span class="mdc-button__label">Abstimmen</span>
                            </button>
                        </div>
                    `;
                    cell.appendChild(card);
                    imageGallery.appendChild(cell);
                });
            }

            if (rankingList) {
                updateRanking(images);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    };

    const updateRanking = (images) => {
        images.sort((a, b) => b.votes - a.votes);
        rankingList.innerHTML = '';
        images.forEach((image, index) => {
            const li = document.createElement('li');
            li.className = 'mdc-list-item';
            li.innerHTML = `
                <span class="mdc-list-item__text">
                    <span class="mdc-list-item__primary-text">${index + 1}. ${image.name}</span>
                    <span class="mdc-list-item__secondary-text">${image.votes} Stimmen</span>
                </span>
            `;
            rankingList.appendChild(li);
        });
    };

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            
            try {
                const res = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    uploadMessage.textContent = 'Bild erfolgreich hochgeladen!';
                    uploadMessage.style.color = 'green';
                    uploadForm.reset();
                    fetchStatus();
                } else {
                    const errorText = await res.text();
                    uploadMessage.textContent = `Fehler: ${errorText}`;
                    uploadMessage.style.color = 'red';
                }
            } catch (error) {
                uploadMessage.textContent = 'Ein Fehler ist aufgetreten.';
                uploadMessage.style.color = 'red';
                console.error('Error uploading file:', error);
            }
        });
    }

    if (imageGallery) {
        imageGallery.addEventListener('click', async (e) => {
            let target = e.target;
            while (target && !target.classList.contains('vote-btn')) {
                target = target.parentElement;
            }

            if (target) {
                const image = target.dataset.image;
                try {
                    const res = await fetch(`/vote/${image}`, { method: 'POST' });
                    if (res.ok) {
                        fetchImages();
                    } else {
                        alert(await res.text());
                    }
                } catch (error) {
                    console.error('Error voting:', error);
                }
            }
        });
    }

    if (page.includes('upload')) {
        fetchStatus();
    } else {
        fetchImages();
    }
});
