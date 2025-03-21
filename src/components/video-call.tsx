"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, VideoIcon, VideoOff, PhoneOff } from "lucide-react"

type VideoCallProps = {
  roomId: string
  username: string
}

export function VideoCall({ roomId, username }: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Initialize WebRTC
  useEffect(() => {
    const initWebRTC = async () => {
      try {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        setLocalStream(stream)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // Create peer connection with STUN/TURN servers
        const configuration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
              urls: "turn:your-turn-server.com",
              username: "username",
              credential: "password",
            },
          ],
        }

        peerConnectionRef.current = new RTCPeerConnection(configuration)

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(track, stream)
          }
        })

        // Handle remote stream
        peerConnectionRef.current.ontrack = (event) => {
          setRemoteStream(event.streams[0])
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
          }
          setIsConnected(true)
        }

        // For demo purposes, we're not implementing the full signaling server
        // In a real app, you would connect to your WebSocket server for signaling
        console.log("WebRTC initialized for room:", roomId)
      } catch (error) {
        console.error("Error initializing WebRTC:", error)
      }
    }

    initWebRTC()

    // Cleanup
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [localStream, roomId])

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    setLocalStream(null)
    setRemoteStream(null)
    setIsConnected(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden bg-muted">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">{username} (You)</div>
        </Card>

        <Card className="relative overflow-hidden bg-muted">
          {remoteStream ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">Remote User</div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Waiting for someone to join...
            </div>
          )}
        </Card>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <Button variant={isMuted ? "outline" : "default"} size="icon" onClick={toggleMute}>
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button variant={isVideoOff ? "outline" : "default"} size="icon" onClick={toggleVideo}>
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
        </Button>

        <Button variant="destructive" size="icon" onClick={endCall}>
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
