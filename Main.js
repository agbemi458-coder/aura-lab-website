import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// This is the new, secure way to call your backend.
// It will automatically point to your Vercel backend URL.
const BACKEND_API_URL = '/api/server'; 

const firebaseConfig = {
  apiKey: "AIzaSyBuAYMYU1nUeWXeSsX3hivNBYdEn7e6cF8",
  authDomain: "aura-lab-cms.firebaseapp.com",
  projectId: "aura-lab-cms",
  storageBucket: "aura-lab-cms.appspot.com",
  messagingSenderId: "698188665628",
  appId: "1:698188665628:web:77d7ab0bbff2482b6d20d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // --- ORIGINAL WORKING CODE (MOBILE MENU, FAQ, ETC.) ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileMenuButton.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
    mobileNavLinks.forEach(link => { link.addEventListener('click', () => { mobileMenu.classList.add('hidden'); }); });
    
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            question.classList.toggle('open');
            question.nextElementSibling.classList.toggle('hidden');
        });
    });

    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const resultsScreen = document.getElementById('results-screen');
    const analyzeBtn = document.getElementById('analyze-btn');
    const startOverBtn = document.getElementById('start-over-btn');
    const uploads = {
        front: { input: document.getElementById('front-upload'), card: document.getElementById('front-card'), preview: document.getElementById('front-preview'), placeholder: document.getElementById('front-placeholder'), check: document.getElementById('front-check'), data: null },
        left:  { input: document.getElementById('left-upload'),  card: document.getElementById('left-card'),  preview: document.getElementById('left-preview'),  placeholder: document.getElementById('left-placeholder'),  check: document.getElementById('left-check'),  data: null },
        right: { input: document.getElementById('right-upload'), card: document.getElementById('right-card'), preview: document.getElementById('right-preview'), placeholder: document.getElementById('right-placeholder'), check: document.getElementById('right-check'), data: null }
    };

    const showScreen = (screen) => {
        startScreen.classList.add('hidden'); loadingScreen.classList.add('hidden'); resultsScreen.classList.add('hidden');
        screen.classList.remove('hidden');
    };

    const checkIfReady = () => {
        const allUploaded = Object.values(uploads).every(upload => upload.data !== null);
        analyzeBtn.disabled = !allUploaded;
    };

    const handleFileSelect = (event, view) => {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            uploads[view].data = reader.result.split(',')[1];
            uploads[view].preview.src = reader.result;
            uploads[view].preview.classList.remove('hidden');
            uploads[view].placeholder.classList.add('hidden');
            uploads[view].check.classList.remove('hidden');
            uploads[view].card.classList.add('filled');
            checkIfReady();
        };
        reader.readDataURL(file);
    };

    Object.keys(uploads).forEach(view => {
        uploads[view].input.addEventListener('change', (e) => handleFileSelect(e, view));
    });

    analyzeBtn.addEventListener('click', () => { if (!analyzeBtn.disabled) { analyzeImages(uploads.front.data, uploads.left.data, uploads.right.data); } });
    
    // --- THIS IS THE ONLY FUNCTION THAT HAS BEEN REPLACED ---
    const analyzeImages = async (front, left, right) => {
        showScreen(loadingScreen);
        try {
            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ front, left, right })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(${response.status} - ${errorResult.error || 'Unknown backend error'});
            }
            
            const result = await response.json();
            
            // The result from Vertex might be nested inside a 'predictions' array
            const predictions = result.predictions || [];
            if (predictions.length === 0) {
                 throw new Error("The AI returned an empty response (no predictions).");
            }

            // The actual content is often a JSON string inside the first prediction
            // It might be in a different property depending on the model, e.g., predictions[0].content or predictions[0].instance.structValue.fields.output.stringValue
            // We'll check for common patterns.
            const content = predictions[0].content || predictions[0].structValue?.fields?.output?.stringValue || JSON.stringify(predictions[0]);
            
            const jsonMatch = content.match(/\{.*\}/s);
            if (!jsonMatch) {
                throw new Error("AI response was not in the expected JSON format.");
            }
            
            const analysis = JSON.parse(jsonMatch[0]);
            displayResults(analysis);

        } catch (error) {
            console.error("Analysis Error:", error);
            // We use a custom modal now instead of alert()
            showCustomError(Analysis Failed: ${error.message});
            resetAdvisor(); 
        }
    };
    // -----------------------------------------------------------

    const displayResults = (analysis) => {
        document.getElementById('analysis-tags').innerHTML = (analysis.skin_concerns || []).map(c => <span class="bg-violet-100 text-violet-800 text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-wider">${c}</span>).join('');
        document.getElementById('product-list').innerHTML = (analysis.product_recommendations || []).map(rec => { 
            const searchQuery = encodeURIComponent(${rec.product_type} with ${rec.key_ingredients});
            const searchUrl = https://www.amazon.com/s?k=${searchQuery};
            return `<div class="bg-white border border-gray-200 p-6 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div class="flex-grow">
                            <h4 class="text-xl uppercase tracking-wider font-bold text-gray-800">${rec.product_type}</h4>
                            <p class="mt-2 text-gray-600 text-sm leading-relaxed">${rec.reason}</p>
                            <p class="mt-3 text-xs"><span class="font-bold text-gray-700 uppercase tracking-widest">Look for:</span><span class="text-violet-600 font-medium"> ${rec.key_ingredients}</span></p>
                        </div>
                        <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="primary-btn mt-4 sm:mt-0 flex-shrink-0 py-2 px-6 text-xs rounded-md">Find Online</a>
                    </div>`;
        }).join('');
        const adviceContainer = document.getElementById('holistic-advice-section');
        const lifestyle = analysis.lifestyle_recommendations;
        if (lifestyle) { 
            adviceContainer.innerHTML = `
                <h3 class="text-xl uppercase tracking-wider font-bold text-center mb-8">Holistic Advice</h3>
                <div class="grid md:grid-cols-2 gap-8">
                    <div class="bg-white border border-gray-200 p-6 rounded-lg">
                        <h4 class="text-lg font-bold tracking-wider uppercase text-violet-600">Dietary Focus</h4>
                        <p class="text-sm text-gray-600 mt-2">${lifestyle.diet.introduction}</p>
                        <div class="mt-4 space-y-2">
                            <p class="font-bold text-sm">Foods to Eat:</p>
                            <ul class="list-disc list-inside text-sm text-gray-700">${(lifestyle.diet.foods_to_eat || []).map(f => <li>${f}</li>).join('')}</ul>
                            <p class="font-bold text-sm mt-3">Foods to Limit:</p>
                            <ul class="list-disc list-inside text-sm text-gray-700">${(lifestyle.diet.foods_to_avoid || []).map(f => <li>${f}</li>).join('')}</ul>
                        </div>
                    </div>
                    <div class="bg-white border border-gray-200 p-6 rounded-lg">
                        <h4 class="text-lg font-bold tracking-wider uppercase text-violet-600">Lifestyle Habits</h4>
                         <p class="text-sm text-gray-600 mt-2">${lifestyle.lifestyle.introduction}</p>
                        <ul class="list-disc list-inside text-sm text-gray-700 mt-4 space-y-2">${(lifestyle.lifestyle.tips || []).map(t => <li>${t}</li>).join('')}</ul>
                    </div>
                </div>`;
        }
        showScreen(resultsScreen);
    };

    const resetAdvisor = () => {
        Object.keys(uploads).forEach(view => {
            uploads[view].data = null;
            uploads[view].preview.classList.add('hidden');
            uploads[view].placeholder.classList.remove('hidden');
            uploads[view].check.classList.add('hidden');
            uploads[view].card.classList.remove('filled');
            uploads[view].input.value = '';
        });
        checkIfReady();
        showScreen(startScreen);
    };
    
    startOverBtn.addEventListener('click', resetAdvisor);
    
    // --- THIS IS YOUR ORIGINAL, WORKING BLOG POST FUNCTION ---
    async function loadBlogPosts() {
        const container = document.getElementById('blog-posts-container');
        try {
            const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(postsQuery);
            if (querySnapshot.empty) {
                container.innerHTML = '<p class="col-span-full text-center text-gray-500">No articles have been published yet.</p>';
                return;
            }
            container.innerHTML = '';
            querySnapshot.forEach(doc => {
                const post = doc.data();
                const postCard = `<a href="post.html?id=${doc.id}" class="bg-white border border-gray-200 rounded-lg overflow-hidden group block">
                        <img src="${post.imageUrl || 'https://placehold.co/600x400/e2e8f0/1f2937?text='}" alt="${post.title}" class="w-full h-48 object-cover">
                        <div class="p-6">
                            <h3 class="text-xl uppercase tracking-wider font-bold text-gray-800">${post.title}</h3>
                            <p class="mt-2 text-gray-600 text-sm leading-relaxed">${post.content.substring(0, 120)}...</p>
                            <span class="inline-block mt-4 text-violet-600 font-bold text-xs uppercase tracking-widest group-hover:text-violet-800 transition-colors">Read Full Article &rarr;</span>
                        </div>
                    </a>`;
                container.innerHTML += postCard;
            });
        } catch (error) {
            console.error("Error loading blog posts:", error);
            container.innerHTML = '<p class="col-span-full text-center text-red-500">Could not load articles.</p>';
        }
    }
    loadBlogPosts();

    // --- HELPER FOR CUSTOM ERROR MODAL ---
    // (Ensure you have a corresponding modal in your index.html)
    const showCustomError = (message) => {
        const errorText = document.querySelector('#error-modal-text'); // Make sure this element exists
        if(errorText) {
            errorText.textContent = message;
            const errorModal = document.querySelector('#error-modal');
            if(errorModal) errorModal.classList.remove('hidden');
        } else {
            // Fallback if the modal doesn't exist for some reason
            alert(message);
        }
    };

    // Add a way to close the error modal
    const closeErrorModalBtn = document.querySelector('#close-error-modal-btn'); // Make sure this element exists
    if(closeErrorModalBtn){
        closeErrorModalBtn.addEventListener('click', () => {
            const errorModal = document.querySelector('#error-modal');
            if(errorModal) errorModal.classList.add('hidden');
        });
    }

});