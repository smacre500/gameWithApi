const SCORE_STORAGE_KEY = 'flag-game-score';
const flagImage = document.getElementById('flag-image');
const optionsContainer = document.getElementById('options');
const statusLabel = document.getElementById('status');
const roundLabel = document.getElementById('round-label');
const totalScoreLabel = document.getElementById('total-score');
const scoreMeta = document.getElementById('score-meta');
const nextButton = document.getElementById('next-button');
const resetButton = document.getElementById('reset-button');
const hintLabel = document.getElementById('hint');

const state = {
	countries: [],
	currentCountry: null,
	round: 1,
	locked: false,
	score: { total: 0, correctAnswers: 0, gamesPlayed: 0 },
};

// Busca las banderas, filtra los códigos y nombres repetidos para que no fallen las opciones
async function fetchCountries() {
	const response = await fetch('https://api.sampleapis.com/countries/countries');

	if (!response.ok) {
		throw new Error(`${response.status}`);
	}

	const data = await response.json();
	const seenCodes = new Set();
	const seenNames = new Set(); // Evita nombres idénticos de la API
	
	const countries = Array.isArray(data)
		? data
			.map((country) => ({
				code: String(country?.abbreviation || '').trim(),
				name: String(country?.name || '').trim(),
				flag: country?.media?.flag || null,
			}))
			.filter((country) => 
				country.code && 
				country.name && 
				country.flag && 
				!seenCodes.has(country.code) && 
				!seenNames.has(country.name) && 
				seenCodes.add(country.code) &&
				seenNames.add(country.name)
			)
		: [];

	if (countries.length < 4) {
		console.log("No se pudieron cargar más de 4 banderas");
	}

	return countries;
}

// Elige elementos al azar de forma correcta y estable mediante llaves aleatorias fijas
function sample(array, amount) {
	return [...array]
		.map((item) => ({ item, sortKey: Math.random() }))
		.sort((a, b) => a.sortKey - b.sortKey)
		.map(({ item }) => item)
		.slice(0, amount);
}

function setStatus(message, tone = 'neutral') {
	statusLabel.textContent = message;
	statusLabel.style.color = tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : 'var(--muted)';
}

// Renderiza el score en la pantalla
function renderScore() {
	totalScoreLabel.textContent = state.score.total;
	scoreMeta.textContent = `Aciertos: ${state.score.correctAnswers} | Partidas: ${state.score.gamesPlayed || 0}`;
}

// Guarda en el json de la página los datos
async function loadScore() {
	try {
		const storedScore = localStorage.getItem(SCORE_STORAGE_KEY);
		state.score = storedScore ? { ...state.score, ...JSON.parse(storedScore) } : state.score;
	} catch {
		state.score = { total: 0, gamesPlayed: 0, correctAnswers: 0 };
	}
	renderScore();
}

// Guarda los puntos
async function saveScore(points) {
	state.score = {
		total: state.score.total + points,
		gamesPlayed: (state.score.gamesPlayed || 0) + 1,
		correctAnswers: state.score.correctAnswers + (points > 0 ? 1 : 0),
	};

	localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(state.score));
	renderScore();
}

// Bloquea respuestas después de cliquear
function lockOptions() {
	state.locked = true;
	Array.from(optionsContainer.querySelectorAll('button')).forEach((button) => {
		button.disabled = true;
		if (button.dataset.country === state.currentCountry?.code) {
			button.classList.add('correct');
		}
	});
	nextButton.disabled = false;
}

// Retorno de los países y muestra las cosas de abajo
function buildRound() {
	if (state.countries.length < 4) {
		setStatus('No hay suficientes países para jugar', 'danger');
		return;
	}
	
	state.locked = false;
	nextButton.disabled = true;
	
	// Selecciona el país correcto de la ronda
	state.currentCountry = state.countries[Math.floor(Math.random() * state.countries.length)];
	
	// Toma 3 opciones incorrectas sin repetir el país actual
	const incorrectOptions = sample(
		state.countries.filter((country) => country.code !== state.currentCountry.code), 
		3
	);
	
	// Junta las opciones e introduce un shuffle real
	const options = [...incorrectOptions, state.currentCountry];
	const shuffledOptions = options
		.map((country) => ({ country, sortKey: Math.random() }))
		.sort((a, b) => a.sortKey - b.sortKey)
		.map(({ country }) => country);

	// Muestra la bandera y suma las rondas
	flagImage.src = state.currentCountry.flag;
	flagImage.alt = `Bandera de ${state.currentCountry.name}`;
	roundLabel.textContent = `Ronda ${state.round}`;
	hintLabel.textContent = 'Cada acierto suma puntos para aprobar la materia. PORFAVOR PROFE APROBAME';
	setStatus('Elige el país correcto');

	// Renderiza los botones con el array correctamente mezclado
	optionsContainer.innerHTML = shuffledOptions
		.map(
			(country) => `
				<button type="button" data-country="${country.code}">${country.name}</button>
			`,
		)
		.join('');

	// Botón de score y cambio de países
	optionsContainer.querySelectorAll('button').forEach((button) => {
		button.addEventListener('click', async () => {
			if (state.locked) {
				return;
			}

			const selected = button.dataset.country;
			const isCorrect = selected === state.currentCountry.code;

			if (isCorrect) {
				button.classList.add('correct');
				setStatus('Correcto. +10 puntos', 'success');
			} else {
				button.classList.add('wrong');
				setStatus(`Incorrecto. Era ${state.currentCountry.name}`, 'danger');
				const correctButton = optionsContainer.querySelector(`button[data-country="${CSS.escape(state.currentCountry.code)}"]`);
				if (correctButton) {
					correctButton.classList.add('correct');
				}
			}
			
			await saveScore(isCorrect ? 10 : 0);
			lockOptions();
		});
	});
}

// Suma ronda			
nextButton.addEventListener('click', () => {
	state.round += 1;
	buildRound();
});

// Resetea todo
resetButton.addEventListener('click', async () => {
	state.score = { total: 0, gamesPlayed: 0, correctAnswers: 0, updatedAt: new Date().toISOString() };
	localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(state.score));
	renderScore();
	state.round = 1;
	buildRound();
});

// Función para cuando se inicializa la API
async function init() {
	try {
		await loadScore();
		setStatus('Cargando países...');
		state.countries = await fetchCountries();
		buildRound();
	} catch (error) {
		console.error(error);
		setStatus('No se pudo iniciar el juego', 'danger');
		hintLabel.textContent = 'Error capa 8, no hay conexión.';
	}
}

init();
