document.addEventListener('DOMContentLoaded', async () => {
    const searchBox = document.getElementById('searchBox');
    const resultDiv = document.getElementById('result');
    const ghostText = document.getElementById('ghostText');
    const searchContainer = document.querySelector('.search-box');
    const wordCountElement = document.getElementById('wordCount');

    let dictionaryData = {};
    let lastQuery = '';
    let hasError = false;

    async function loadData() {
        try {
            const vocabularyResponse = await fetch('vocabulary.json');
            if (!vocabularyResponse.ok) {
                throw new Error('Oops!');
            }
            dictionaryData = await vocabularyResponse.json();
            console.log(dictionaryData); // JSON verisini kontrol et

            // Örnek olarak specialWords ve clickableWords'i kontrol et
            console.log('Special Words:', dictionaryData.specialWords);
            console.log('Clickable Words:', dictionaryData.clickableWords);

            const wordCount = Object.keys(dictionaryData).length;
            wordCountElement.innerHTML = `Portrait of Proto-Turkic in <span class="highlight">${wordCount}</span> Entries.`;
            searchContainer.classList.remove('error'); // Hata olmadığında "error" sınıfını kaldır
            return true;
        } catch (error) {
            console.error('Oops!', error);
            hasError = true;
            wordCountElement.innerHTML = `<p class="error-message">Oops!</p>`;
            searchContainer.classList.add('error'); // Hata durumunda "error" sınıfını ekle
            resultDiv.classList.add('hidden');
            ghostText.classList.add('hidden');
            return false;
        }
    }


    function loadSearchFromHash() {
        const hash = decodeURIComponent(window.location.hash.substring(1));
        if (hash) {
            searchBox.value = hash;
            updateSearch(hash);
            updateSearchBoxPlaceholder(hash);
        }
    }

    window.addEventListener('load', async () => {
        if (!window.location.hash || window.location.hash === "#") {
            window.location.hash = '#';
        }

        const isLoaded = await loadData();
        if (isLoaded) {
            loadSearchFromHash();
        }
    });

    window.addEventListener('hashchange', () => {
        const hash = decodeURIComponent(window.location.hash.substring(1));
        if (hash) {
            searchBox.value = hash;
            updateSearch(hash);
            updateSearchBoxPlaceholder(hash);
        } else {
            resultDiv.classList.add('hidden');
            ghostText.textContent = '';
            searchBox.value = '';
            searchContainer.classList.remove('error');
            resultDiv.innerHTML = '';
        }

        const tooltips = document.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    });

    searchBox.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        ghostText.textContent = '';

        // Eğer JSON yüklenememişse, searchContainer'ın "error" sınıfını kaldırma.
        if (!hasError) {
            if (query) {
                window.location.hash = encodeURIComponent(query);
            } else {
                history.replaceState(null, null, ' ');
            }
            updateSearch(query);
            updateSearchBoxPlaceholder(query);
        } else {
            searchContainer.classList.add('error'); // Eğer hata varsa, "error" sınıfını ekle.
        }
    });


    function updateSearch(query) {
        if (dictionaryData && Object.keys(dictionaryData).length > 0) {
            searchWord(query);
        } else {
            console.error('Dictionary data not loaded.');
        }
    }

    function searchWord(query) {
        if (query === lastQuery) {
            return;
        }
        lastQuery = query;

        resultDiv.innerHTML = '';

        if (query.startsWith(' ') || query.trim().length === 0) {
            if (query.length === 0) {
                searchContainer.classList.remove('error'); // Hata yoksa "error" sınıfını kaldır
                ghostText.textContent = "";
                return;
            }
            searchContainer.classList.add('error'); // Hata varsa "error" sınıfını ekle
            ghostText.textContent = "";
            return;
        } else {
            searchContainer.classList.remove('error'); // Sorgu geçerli olduğunda "error" sınıfını kaldır
        }

        const normalizedQuery = normalizeTurkish(query);

        const sortedWords = Object.keys(dictionaryData)
            .map(word => ({ word: normalizeTurkish(word), original: word }))
            .sort((a, b) => a.word.localeCompare(b.word));

        const closestWord = sortedWords
            .find(({ word }) => word.startsWith(normalizedQuery));

        if (closestWord) {
            const wordDetails = dictionaryData[closestWord.original];
            const description = wordDetails.a.replace(/\n/g, "<br>");
            const descriptionElement = document.createElement('p');
            descriptionElement.classList.add('description');
            descriptionElement.innerHTML = highlightWords(sanitizeHTML(description), dictionaryData.specialWords);
            resultDiv.appendChild(descriptionElement);

            const descriptionHeight = descriptionElement.offsetHeight;
            descriptionElement.style.maxHeight = `${descriptionHeight}px`;

            resultDiv.style.animation = 'fadeIn 1s ease-in-out';

            ghostText.textContent = closestWord.word.substring(query.length);
        } else {
            ghostText.textContent = "";
            searchContainer.classList.add('error'); // Sonuç bulunamadığında "error" sınıfını ekle
        }

        resultDiv.style.animation = 'none';
        resultDiv.offsetHeight;
        resultDiv.style.animation = 'fadeIn 1s ease-in-out';

        createClickableWords();
    }


    function createClickableWords() {
        if (dictionaryData.clickableWords) {
            Object.keys(dictionaryData.clickableWords).forEach(key => {
                const clickableWords = dictionaryData.clickableWords[key];
                const regex = new RegExp(`(${key.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1")})`, 'gi');
                resultDiv.innerHTML = resultDiv.innerHTML.replace(regex, `<span class="clickable-word" style="color: #e9d677; cursor: pointer;">$1</span>`);
            });

            const clickableElements = document.querySelectorAll('.clickable-word');
            clickableElements.forEach(element => {
                element.addEventListener('click', function () {
                    const word = this.textContent;
                    this.style.textDecoration = 'underline';
                    showWordMeanings(word, this);
                });
            });
        }
    }


    function showWordMeanings(word, element) {
        const clickableWords = dictionaryData.clickableWords[word] || [];

        const existingTooltips = document.querySelectorAll('.tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());

        if (clickableWords.length > 0) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            const random = Math.floor(Math.random() * clickableWords.length);
            let meaning = "";
            clickableWords[random].forEach(tempMeaning => meaning += tempMeaning + "<br>");
            tooltip.innerHTML = meaning;

            document.body.appendChild(tooltip);

            const elementRect = element.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.display = 'block';

            const tooltipRect = tooltip.getBoundingClientRect();
            let top = elementRect.top + window.scrollY - tooltipRect.height - 5;
            let left = elementRect.left + window.scrollX + (elementRect.width / 2) - (tooltipRect.width / 2);

            if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 5;
            }
            if (left < 0) {
                left = 5;
            }

            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;

            tooltip.style.opacity = 0;
            tooltip.style.transition = 'opacity 0.3s ease-in-out';
            setTimeout(() => {
                tooltip.style.opacity = 1;
            }, 50);

            element.addEventListener('mouseleave', function () {
                tooltip.style.opacity = 0;
                setTimeout(() => {
                    tooltip.remove();
                    element.style.textDecoration = 'none';
                }, 300);
            });
        }
    }

    function normalizeTurkish(text) {
        return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
    }

    function sanitizeHTML(htmlString) {
        return DOMPurify.sanitize(htmlString, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br']
        });
    }

    function highlightWords(text, specialWords) {
        if (!specialWords) return text;

        // Özel kelimeleri işaretleyelim
        let markedText = text;
        for (const [key, value] of Object.entries(specialWords)) {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            markedText = markedText.replace(regex, `[SPECIAL:${key}]`);
        }

        // Özel kelimeleri stilize edelim
        let resultText = markedText;
        for (const [key, value] of Object.entries(specialWords)) {
            const regex = new RegExp(`\\[SPECIAL:${key}\\](\\s+)(\\S+)`, 'gi');
            resultText = resultText.replace(regex, (match, p1, p2) => {
                return `<b>${value}</b>${p1}<span class="pink">${p2}</span>`;
            });
        }

        // İşaretleme etiketlerini temizleyelim
        resultText = resultText.replace(/\[SPECIAL:\S+\]/g, '');

        return resultText;
    }

    function updateSearchBoxPlaceholder(query) {
        if (!query) {
            ghostText.textContent = '';
            return;
        }
        const queryLower = normalizeTurkish(query);
        const matchingWord = Object.keys(dictionaryData)
            .map(word => ({ word: normalizeTurkish(word), original: word }))
            .sort((a, b) => a.word.localeCompare(b.word))
            .find(({ word }) => word.startsWith(queryLower));

        if (matchingWord) {
            const remainingPart = matchingWord.word.substring(query.length);
            ghostText.textContent = remainingPart;

            const inputRect = searchBox.getBoundingClientRect();
            const inputStyle = window.getComputedStyle(searchBox);
            const paddingLeft = parseFloat(inputStyle.paddingLeft);
            const fontSize = parseFloat(inputStyle.fontSize);

            const firstCharWidth = getTextWidth(query, fontSize);
            ghostText.style.left = `${paddingLeft + firstCharWidth}px`;
        } else {
            ghostText.textContent = "";
        }
    }

    function getTextWidth(text, fontSize) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px 'Poppins', sans-serif`;
        return context.measureText(text).width;
    }

    searchBox.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        ghostText.textContent = '';

        // Eğer JSON yüklenememişse, searchContainer'ın "error" sınıfını kaldırma.
        if (!hasError) {
            if (query) {
                window.location.hash = encodeURIComponent(query);
            } else {
                history.replaceState(null, null, ' ');
            }
            updateSearch(query);
            updateSearchBoxPlaceholder(query);
        } else {
            searchContainer.classList.add('error'); // Eğer hata varsa, "error" sınıfını ekle.
        }
    });


    document.querySelector('#result').addEventListener('click', (e) => {
        if (e.target.classList.contains('searchable')) {
            const searchbox = document.querySelector('#searchBox');
            searchBox.value = e.target.textContent;
            searchBox.dispatchEvent(new Event('input'));
        }
    });
});