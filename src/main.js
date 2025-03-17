import './style.css'
import * as THREE from 'three'
import { addBoilerPlateMeshes, addStandardMesh, addTexturedMesh, } from './addDefaultMeshes'
import { addLight } from './addDefaultLights'
import Model from './Model'
import { postprocessing } from './postprocessing'

const renderer = new THREE.WebGLRenderer({ antialias: true })

const clock = new THREE.Clock()

const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	100
)

const mixers = []
const meshes = {}
const lights = {}

const scene = new THREE.Scene()
const baseScale = 1.5;

let composer

let file = document.querySelector('.audiofile')
let audio = document.querySelector('.audio')

let analyser
let bufferTime
let dataArray
let averageAmp
let averageFreq

const clamp = (num, min, max) => Math.min(Math.max(num, min), max)
init()

function init() {
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	meshes.default = addBoilerPlateMeshes()
	meshes.standard = addStandardMesh()
	meshes.physical = addTexturedMesh()

	lights.default = addLight()
	
	scene.add(lights.default)
	//scene.add(meshes.default)
	//scene.add(meshes.standard)
	//scene.add(meshes.physical)

	meshes.physical.position.set(-2, 2, 0)
	camera.position.set(0, 0, 5)
	composer = postprocessing(scene, camera, renderer)

	loadAudio()
	instances()
	resize()
	animate()
}

function instances() {
	const angelExample = new Model({
		name: 'angel',
		scene: scene,
		meshes: meshes,
		url: 'angel.glb',
		scale: new THREE.Vector3(baseScale, baseScale, baseScale),
		position: new THREE.Vector3(0, 0, 0),
		//replace: true,
		//replaceURL: 'disturb.jpg',

		animationState: true,
		mixers: mixers,
	})
	angelExample.init()
}

function initAudio() {
	const context = new AudioContext()
	const src = context.createMediaElementSource(audio)
	analyser = context.createAnalyser()
	src.connect(analyser)
	analyser.connect(context.destination)

	analyser.fftSize = 512 //size of fft
	const bufferLength = analyser.frequencyBinCount //# within the frequency domain
	dataArray = new Uint8Array(bufferLength) //array that holds frequency data
	bufferTime = new Uint8Array(bufferLength) //array that holds time domain data
	analyser.getByteTimeDomainData(bufferTime) 
}

function loadAudio() {
	//play audio when page loads
	document.onload = () => {
		audio.play()
	}

	//load audio file
	file.onchange = (e) => {
		let file = e.target.files[0]
		if (file) {
			let fileURL = URL.createObjectURL(file)
			audio.src = fileURL
			audio.play()
			initAudio()
		}
	}
}

function resize() {
	window.addEventListener('resize', () => {
		renderer.setSize(window.innerWidth, window.innerHeight)
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
	})
}

console.log(Math.clamp)

function animate() {
	const delta = clock.getDelta()
	requestAnimationFrame(animate)

	// meshes.default.rotation.x += 0.01
	// meshes.default.rotation.y -= 0.01
	// meshes.default.rotation.z -= 0.02

	// meshes.standard.rotation.x += 0.01
	// meshes.standard.rotation.y += 0.02
	// meshes.standard.rotation.z -= 0.012

	// meshes.physical.rotation.x += 0.01
	// meshes.physical.rotation.y -= 0.01
	// meshes.physical.rotation.z -= 0.02

	for (const mixer of mixers) {
		mixer.update(delta)
	}
	if (meshes.angel) {
		meshes.angel.rotation.y -= 0.01
	}

	if (analyser) {
		analyser.getByteFrequencyData(dataArray) //fill dataArray with amplitude of each frequency
		analyser.getByteTimeDomainData(bufferTime)
		averageFreq = getAverageFrequency(dataArray) //average frequency amplitude
		averageAmp = getRMS(bufferTime) //rms of waveform

		// meshes.standard.scale.x = averageAmplitude * 0.003
		// meshes.standard.scale.y = averageAmplitude * 0.003
		// meshes.standard.scale.z = averageAmplitude * 0.003

		meshes.angel.scale.x = baseScale + (averageFreq * 0.010)
		meshes.angel.scale.y = baseScale + (averageFreq * 0.010)
		meshes.angel.scale.z = baseScale + (averageFreq * 0.010)

		// meshes.standard.scale.x = averageAmplitude * 0.003
		// meshes.standard.scale.y = averageAmplitude * 0.003
		// meshes.standard.scale.z = averageAmplitude * 0.003

		if (averageAmp > 80 && averageAmp < 100) { 
			composer.glitch.enabled = false   //glitch off
			composer.bloom.strength = 0.8   //high bloom
		} else if (averageFreq < 80 && averageFreq > 10) { 
			composer.glitch.enabled = true //glitch on
			composer.bloom.strength = 0.1 //low bloom
		} else {
			composer.glitch.enabled = false  //glitch off
			composer.bloom.strength = 0    //no bloom
		}
	}

	//renderer.render(scene, camera)
	composer.composer.render()
	//composer.composer.render()
}

function getAverageFrequency(dataArray) {
	//calculates the average frequency from the frequency data array
	let value = 0
	const data = dataArray

	for (let i = 0; i < data.length; i++) {
		value += data[i]
	}

	return value / data.length
}

function getRMS(bufferTime) {
	//calculates RM) of the time domain data
	let bTime = bufferTime
	var rms = 0
	for (let i = 0; i < bTime.length; i++) {
		rms += bTime[i] * bTime[i]
	}
	rms /= bTime.length
	rms = Math.sqrt(rms)
	return rms
}
