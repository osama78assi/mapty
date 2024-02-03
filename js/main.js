'use strict';

const form = document.querySelector('.form-workout');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('#type');
const inputDistance = document.querySelector('#distance');
const inputDuration = document.querySelector('#duration');
const inputCadence = document.querySelector('#cadence');
const inputElevation = document.querySelector('#elevation');
const mapContainer = document.querySelector('.map');


// Generate Ids
class genId {
  static id = (function() {
    if(localStorage.getItem('workouts')) { // Get Biggest Id From Localstorage If Exists
      let workouts = JSON.parse(localStorage.getItem('workouts'));
      let largest = workouts[workouts.length - 1]?.id ?? 0;
      return ++largest;
    }
    else {
      return 0;
    }
  }());
}

// Parent Class For Cycling And Running
class Workout {
  static idCounter;
  static months = ['January', 'February', 'March', 'Aprial', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
    this.id = genId.id++;
  }
  date() {
    const dateNow = new Date(); // Optional Chaining To Know Type Of The Object Depend On Properties (pace => running Otherwise Cycling)
    return `${this?.pace ? 'Running' : 'Cycling'} On ${dateNow.getDate()} ${Workout.months[dateNow.getMonth()]}`;
  }
}

// Cycling Class
class Cycling extends Workout {
  constructor(distance, duration, coords, elvationGain) {
    super(distance,duration, coords);
    this.elvationGain = elvationGain;
    this.calcSpeed();
    this.date = this.date();
  }
  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
    return this.speed;
  }
}

// Running Class
class Running extends Workout {
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this.date = this.date();
  }
  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

// App Class
class App {
  #map;
  #mapZoom = 13;
  #workoutsArr = [];
  #eventMap;
  constructor() {
    this._getPosition();
    document.addEventListener('keydown', this._submitForm.bind(this));
    inputType.addEventListener('change', this._toggleFields.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteLocalstorage.bind(this));
  }
  _getPosition() { // Generate A Position Or Error In Failure
    if(navigator.geolocation) {
      navigator.geolocation
      .getCurrentPosition(this._loadMap.bind(this), this._errorLoadingMap); // Get Location
    }
  }
  _loadMap(position) { // Success Loading The Map
    // Load The Old Workouts
    const {latitude} = position.coords; // x
    const {longitude} = position.coords; // y
    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoom); // Render Map On Element);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { // Add Tiles
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);
    this.#map.on('click', function(mapEvent) { // Handle CLicks On Map
      this.#eventMap = mapEvent;
      this._showForm();
    }.bind(this)); // Make This Refer To App
    this._getLocalstorage(); // Get Workouts From Local Storage
  }
  _errorLoadingMap() { // Failure Loading The Map
    mapContainer.insertAdjacentHTML('afterbegin',
    `<p class='error'>Can't Access Your Location !</p>`);
  }
  _showForm() { // Show The Form
    form.classList.remove('hide');
    setTimeout(() => {
      form.classList.remove('form-hidden');
    }, 0); // Make Some Cooldown To Remove
  }
  _hideForm() { // Hide The Form
    form.classList.add('hide');
    setTimeout(() => {
      form.classList.add('form-hidden');
    }, 0); // Make Some Cooldown To Remove
  }
  _submitForm(e) { // Form Events
    if(e.key === 'Enter' && !form.classList.contains('hide')) {
      e.preventDefault();
      this._checkInputs();
    }
  }
  _toggleFields() { // Form Events
    inputElevation.closest('.input-group').classList.toggle('hide');
    inputCadence.closest('.input-group').classList.toggle('hide');
  }
  _moveToPopup(e) { // Move To Mark When Click On The Workout
    const workoutEle = e.target.closest('li')
    if(!workoutEle) // If There Is No Closest Li(Like Clicking On ul itself)
      return;
    const workoutObj = this.#workoutsArr.find((workout) => workout.id == workoutEle.dataset.id); // Find The Object
    this.#map.setView(workoutObj.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      }
    }); // Zoom On It
  }
  _checkInputs() { // Check The Input That Comes From The From
    const inputs = form.querySelectorAll('.input-group:not(.hide) .input');
    const labels = form.querySelectorAll('.input-group:not(.hide) label'); // Labels To Know Where Does User Got Error
    const values = ['running', 0, 0, 0]; // Default Values
    for(let i = 0; i < inputs.length; i++) {
      if(inputs[i].value == '') {
        this._inputPopup(labels[i].innerText, 'Mustn\'t Be Empty')
        return 0;
      }
      else if(/\b\d+\b/.test(inputs[i].value) && i != 0) { // Check If It's Number
        if(Number.parseInt(inputs[i].value) <= 0) {
          this._inputPopup(labels[i].innerText, 'Must Be Positive Number');
          return 0;
        }
      }
      else {
        this._inputPopup(labels[i].innerText, 'Must Be Number');
      }
      values[i] = inputs[i].value;
    }
    inputs[1].value = inputs[2].value = inputs[3].value = ''; // Clear Inputs
    this._newWorkout(values); // Create New Workout
    return 1;
  }
  _inputPopup(labelName, errorMsg) { // Creating Input Errors Message
    const errorContainer = document.createElement('p');
    errorContainer.classList.add('hide', 'form-error', 'not-visibile');
    errorContainer.innerText = `${labelName} ${errorMsg}`;
    form.insertAdjacentElement(`afterbegin`, errorContainer);
    this._renderInputPopup(errorContainer);
  }
  _renderInputPopup(element) { // Rendering Input Error Message
    setTimeout(() => {
      element.classList.remove('hide');
    }, 0); // Make Some Animation On The Popup After Adding It
    setTimeout(() => {
      element.classList.remove('not-visibile');
    }, 10); // Just A Few MilleSec To Show The Popup
    setTimeout(() => {
      element.classList.add('not-visibile');
    }, 1000); // Hide It
    setTimeout(() => {
      element.remove();
    }, 1500); // Wait The Transition On The Popup And Delete It
  }
  _newWorkout(values) { // Create New Workout
    const {lat, lng} = this.#eventMap.latlng;
    let workout;
    if(values[0] == 'running') { // Check If The Type Is Running To Create A Running Object
      workout = new Running(values[1], values[2], [lat, lng], values[3]); // Inputs Values In HTML Form Order
    }
    else { // Else Create Cycling Object
      workout = new Cycling(values[1], values[2], [lat, lng], values[3]);
    }
    this.#workoutsArr.push(workout);
    this._renderWorkoutMarker(workout); // Render The Mark On The Map
    this._renderWorkout(workout); // Render Workout On The Document
    this._setLocalstorage(); // Save This Workout In Localstorage
    this._hideForm();
  }
  _renderWorkoutMarker(workout) { // Render Workout Mark With Popup
    let coords = workout.coords, className;
    if(workout?.pace) {
      className = 'type-running';
    }
    else {
      className = 'type-cycling';
    } // Content Of The Mark Popup
    const content = workout.date;
    L.marker(coords)
    .addTo(this.#map)
    .bindPopup(
      L.popup({
        maxWidth: 300,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: className,
      })
    )
    .setPopupContent(`${workout.type == 'Running' ? '🦶' : '🚴‍♂️'} ${content}`)
    .openPopup();
  }
  _renderWorkout(workout) { // Render Workouts On The Page
    let html; // The HTML Element
    let {distance, duration} = workout; // The Intersected Values
    let absolute, speed, units, emojis, className; // Some Variables
    if(workout?.pace) {
      className = 'type-running';
      emojis = ['🏃‍♂️', '🦶'];
      absolute = workout.cadence;
      speed = workout.pace;
      units = ['MIN/KM', 'SPM'];
    }
    else {
      className = 'type-cycling';
      emojis = ['🚴', '⛰'];
      absolute = workout.elvationGain;
      speed = workout.speed;
      units = ['KM/H', 'M'];
    }
    html =
    `
    <li class="workout ${className}" data-id=${workout.id}>
    <span class='x' data-delete=${workout.id}>x</span>
    <h2 class="workout-date">${workout.date}</h2>
    <div class="content">
      <span class="content-details">${emojis[0]} ${distance}<span class="unit"> KM</span></span>
      <span class="content-details">⏱ ${duration}<span class="unit"> MIN</span></span>
      <span class="content-details">⚡ ${speed}<span class="unit"> ${units[0]}</span></span>
      <span class="content-details">${emojis[1]} ${absolute}<span class="unit"> ${units[1]}</span></span>
    </div>
    </li>
    `;
    containerWorkouts.insertAdjacentHTML('afterbegin', html);
  }
  _getLocalstorage() { // Get Workouts From Local Storage
    if(localStorage.getItem('workouts')) {
      this.#workoutsArr = JSON.parse(localStorage.getItem('workouts'));
      this.#workoutsArr.forEach(function(workout) {
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);
      }.bind(this));
    }
  }
  _setLocalstorage() { // Set Workout In Local Storage
    localStorage.setItem('workouts', JSON.stringify(this.#workoutsArr)); // Store An Array Of Workouts
  }
  _deleteLocalstorage(e) { // Delete Workout From Local Storage
    if(e.target.classList.contains('x')) {
      const deleted = this.#workoutsArr.findIndex((workout) => workout.id == e.target.dataset.delete);
      this.#workoutsArr.splice(deleted, 1);
      this._setLocalstorage();
      containerWorkouts.innerHTML = '';
      location.reload();
    }
  }
}



let app = new App();



