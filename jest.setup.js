// Mock MediaStream and related APIs
class MockMediaStream {
  constructor() {
    this.tracks = []
    this.id = Math.random().toString(36).substring(2, 15)
    this.active = true
  }

  addTrack(track) {
    this.tracks.push(track)
  }

  getTracks() {
    return this.tracks
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video")
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio")
  }
}

class MockMediaStreamTrack {
  constructor(kind) {
    this.kind = kind
    this.id = Math.random().toString(36).substring(2, 15)
    this.enabled = true
    this.muted = false
    this.readyState = "live"
  }

  stop() {
    this.readyState = "ended"
  }

  getSettings() {
    return {
      width: 640,
      height: 480,
      frameRate: 30,
    }
  }
}

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockImplementation(() => {
      const stream = new MockMediaStream()
      stream.addTrack(new MockMediaStreamTrack("video"))
      stream.addTrack(new MockMediaStreamTrack("audio"))
      return Promise.resolve(stream)
    }),
  },
  writable: true,
})

// Mock HTMLMediaElement
Object.defineProperty(window.HTMLMediaElement.prototype, "srcObject", {
  writable: true,
  value: null,
})

Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
  writable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve()),
})

Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
  writable: true,
  value: jest.fn(),
})

// Mock RTCPeerConnection
global.RTCPeerConnection = class {
  constructor() {
    this.onicecandidate = null
    this.ontrack = null
    this.oniceconnectionstatechange = null
    this.onicegatheringstatechange = null
    this.onconnectionstatechange = null
    this.onnegotiationneeded = null
    this.iceConnectionState = "new"
    this.iceGatheringState = "new"
    this.connectionState = "new"
    this.signalingState = "stable"
    this.localDescription = null
    this.remoteDescription = null
    this._senders = []
    this._receivers = []
    this._transceivers = []
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addTrack(track, stream) {
    this._senders.push({ track })
    return { track }
  }

  addTransceiver(kind, options) {
    const transceiver = { direction: options?.direction || "sendrecv" }
    this._transceivers.push(transceiver)
    return transceiver
  }

  createOffer() {
    return Promise.resolve({ type: "offer", sdp: "mock-sdp" })
  }

  createAnswer() {
    return Promise.resolve({ type: "answer", sdp: "mock-sdp" })
  }

  setLocalDescription(desc) {
    this.localDescription = desc
    return Promise.resolve()
  }

  setRemoteDescription(desc) {
    this.remoteDescription = desc
    return Promise.resolve()
  }

  addIceCandidate() {
    return Promise.resolve()
  }

  close() {
    this.connectionState = "closed"
  }

  getTransceivers() {
    return this._transceivers
  }

  getSenders() {
    return this._senders
  }

  getReceivers() {
    return this._receivers
  }

  restartIce() {
    // Mock implementation
  }
}

// Mock RTCSessionDescription
global.RTCSessionDescription = class {
  constructor(init) {
    Object.assign(this, init)
  }
}

// Mock RTCIceCandidate
global.RTCIceCandidate = class {
  constructor(init) {
    Object.assign(this, init)
  }

  toJSON() {
    return this
  }
}

// Mock window.socket for WebSocket tests
global.window.socket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true,
}

