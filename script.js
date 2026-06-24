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
	score: { total: 0, correctAnswers: 0 },
};


//busca las banderas y filtra los codigos asi se ven bien y consulta a la api
async function fetchCountries() {
	const response = await fetch('https://api.sampleapis.com/countries/countries');

	if (!response.ok) {
		throw new Error(`${response.status}`);
	}

	const data = await response.json();
	const seenCodes = new Set();
	const countries = Array.isArray(data)
		? data
			.map((country) => ({
				code: String(country?.abbreviation || '').trim(),
				name: String(country?.name || '').trim(),
				flag: country?.media?.flag || null,
			}))
			.filter((country) => country.code && country.name && country.flag && !seenCodes.has(country.code) && seenCodes.add(country.code))
		: [];

	if (countries.length < 4) {
		console.log("no se pudieron cargar mas de 4 banderas")
	}

	return countries;
}
// elige al azar
function sample(array, amount) {
	return [...array].sort(() => Math.random() - 1).slice(0, amount);
}

function setStatus(message, tone = 'neutral') {
	statusLabel.textContent = message;
	statusLabel.style.color = tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : 'var(--muted)';
}
//renderiza el score en la pantalla
function renderScore() {
	totalScoreLabel.textContent = state.score.total;
	scoreMeta.textContent = `Aciertos: ${state.score.correctAnswers} | Partidas: ${state.score.gamesPlayed}`;
}
// guarda en el json de la pagina los datos
async function loadScore() {
	try {
		const storedScore = localStorage.getItem(SCORE_STORAGE_KEY);
		state.score = storedScore ? { ...state.score, ...JSON.parse(storedScore) } : state.score;
	} catch {
		state.score = { total: 0, gamesPlayed: 0, correctAnswers: 0  };
	}
	renderScore();
}
//guarda los puntos
async function saveScore(points) {
	state.score = {
		total: state.score.total + points,
		gamesPlayed: state.score.gamesPlayed + 1,
		correctAnswers: state.score.correctAnswers + (points > 0 ? 1 : 0),
	};

	localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(state.score));
	renderScore();
}
//bloquea respuestas despues de clikear
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
//return de los paises y muestra las cosas de abajo
function buildRound() {
	if (state.countries.length < 4) {
		setStatus('No hay suficientes países para jugar', 'danger');
		return;
	}
	 //busca todos los paises randoms y despues muestra uno correcto a la bandera que se mostro, muestra que su re god grande copilot te amo
	state.locked = false;
	nextButton.disabled = true;
	state.currentCountry = state.countries[Math.floor(Math.random() * state.countries.length)];
	const options = sample(state.countries.filter((country) => country.code !== state.currentCountry.code), 3);
	options.push(state.currentCountry);
	options.sort(() => Math.random() - 0.5); //para que salga en un lugar random
	//muestra la bandera y suma las rondas y eso
	flagImage.src = state.currentCountry.flag;
	flagImage.alt = `Bandera de ${state.currentCountry.name}`;
	roundLabel.textContent = `Ronda ${state.round}`;
	hintLabel.textContent = 'Cada acierto suma puntos para aprobar la materia. PORFAVOR PROFE APROBAME';
	setStatus('Elige el pais correcto');
	// boton del pais correcto
	optionsContainer.innerHTML = options
		.map(
			(country) => `
				<button type="button" data-country="${country.code}">${country.name}</button>
			`,
		)
		.join('');
// boton de escore y cambio de paises
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
			//los puntos
			await saveScore(isCorrect ? 10 : 0);
			lockOptions();
		});
	});
}
//suma ronda			
nextButton.addEventListener('click', () => {
	state.round += 1;
	buildRound();
});
//reseta todo
resetButton.addEventListener('click', async () => {
	state.score = { total: 0, gamesPlayed: 0, correctAnswers: 0, updatedAt: new Date().toISOString() };
	localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(state.score));
	renderScore();
	state.round = 1;
	buildRound();
});
//FUNCION PARA CUANDO NO SE INICIALIZA LA API Y NO CARGA EL PAIS
async function init() {
	try {
		await loadScore();
		setStatus('maldita api carga el pais');
		state.countries = await fetchCountries();
		buildRound();
	} catch (error) {
		console.error(error);
		setStatus('No se pudo iniciar el juego', 'danger');
		hintLabel.textContent = 'error capa 8, no hay conexion .';
	}
}

init();
