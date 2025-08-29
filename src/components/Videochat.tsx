"use client";

import { CSSProperties, useRef, useState, useEffect } from "react";
import ZoomVideo, {
  type VideoClient,
  type Participant,
  VideoQuality,
  type VideoPlayer,
} from "@zoom/videosdk";
import { CameraButton, MicButton } from "./MuteButtons";
import { PhoneOff } from "lucide-react";
import { Button } from "./ui/button";

const Videochat = (props: { slug: string; JWT: string, role:number }) => {
  const session = props.slug;
  const jwt = props.JWT;
  const role = props.role;
  const [inSession, setInSession] = useState(false);
  const client = useRef<typeof VideoClient>(ZoomVideo.createClient());
  const [isVideoMuted, setIsVideoMuted] = useState(!client.current.getCurrentUserInfo()?.bVideoOn);
  const [isAudioMuted, setIsAudioMuted] = useState(client.current.getCurrentUserInfo()?.muted ?? true);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const userName = `User-${new Date().getTime().toString().slice(8)}`;

  // Track state for chat messages and chat input text
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // Track state for current users in vidoo call
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Update participant state when they join or leave
  useEffect(() => {
    client.current.on("user-added", (payload: any) => {
      const participantsMap = client.current.getAllUser()
      const participants = Array.from(participantsMap.values());
      setParticipants(participants);
    })
    // Add cleanup function here
  }, [inSession])

  const currentUser = client.current.getCurrentUserInfo();
  const isHost = client.current.isOriginalHost() || role === 1; // Returns true if JWT payload role_type === 1

  console.log("Is this user the original host? " + isHost);

  // Get the chat client reference to enable chat functionality
  const chat = client.current.getChatClient();

  const joinSession = async () => {
    await client.current.init("en-US", "Global", { patchJsMedia: true });
    client.current.on("peer-video-state-change", renderVideo);
    await client.current.join(session, jwt, userName)
      .catch((e) => console.log(e));
    setInSession(true);
    const mediaStream = client.current.getMediaStream();
    await mediaStream.startAudio();
    setIsAudioMuted(mediaStream.isAudioMuted());
    await mediaStream.startVideo();
    setIsVideoMuted(!mediaStream.isCapturingVideo());
    await renderVideo({ action: "Start", userId: client.current.getCurrentUserInfo().userId, });

    // TODO Display chat messages by listening for the incoming messages (INCOMPLETE)
    client.current.on('chat-on-message', (payload) => {
      console.log(payload)
      console.log(`Message: ${payload.message}, from ${payload.sender.name} to ${payload.receiver.name}`)
    })
  };

  // Functions that enable the host user to do actions on participants
  const removeParticipant = async (userId: number) => {
    await client.current.removeUser(userId);
  }

  // Check if host requested to mute or unmute mic
  const muteParticipant = async (userId: number) => {
    // TODO need to use chat client to check if host sent message asking to mute audio and then use that to trigger mute audio
    const mediaStream = client.current.getMediaStream();
    await mediaStream.muteAudio();
  }

  const unmuteParticipant = (userId: number) => {
    client.current.on('host-ask-unmute-audio', async (payload) => {
      const mediaStream = client.current.getMediaStream();
      await mediaStream.unmuteAudio();
    });
  }

  const endSession = async () => {
    await client.current.leave(true); // Ends session for everyone
  }

  // TODO Function for sending messages
  const sendMessage = async () => {
    
  }

  const renderVideo = async (event: { action: "Start" | "Stop"; userId: number; }) => {
    const mediaStream = client.current.getMediaStream();
    if (event.action === "Stop") {
      const element = await mediaStream.detachVideo(event.userId);
      Array.isArray(element) ? element.forEach((el) => el.remove()) : element.remove();
    } else {
      const userVideo = await mediaStream.attachVideo(event.userId, VideoQuality.Video_360P);
      videoContainerRef.current!.appendChild(userVideo as VideoPlayer);
    }
  };

  const leaveSession = async () => {
    client.current.off("peer-video-state-change", renderVideo);
    await client.current.leave().catch((e) => console.log("leave error", e));
    // hard refresh to clear the state
    window.location.href = "/";
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0">
        Session: {session}
      </h1>
      <div
        className="flex w-full flex-1"
        style={inSession ? {} : { display: "none" }}
      >
        {/* @ts-expect-error html component */}
        <video-player-container ref={videoContainerRef} style={videoPlayerStyle} />
      </div>
      {!inSession ? (
        <div className="mx-auto flex w-64 flex-col self-center">
          <div className="w-4" />
          <Button className="flex flex-1" onClick={joinSession} title="join session">
            Join
          </Button>
        </div>
      ) : (
        <div className="flex w-full flex-col justify-around self-center">
          <div className="mt-4 flex w-[30rem] flex-1 justify-around self-center rounded-md bg-white p-4">
            <CameraButton
              client={client}
              isVideoMuted={isVideoMuted}
              setIsVideoMuted={setIsVideoMuted}
              renderVideo={renderVideo}
            />
            <MicButton
              isAudioMuted={isAudioMuted}
              client={client}
              setIsAudioMuted={setIsAudioMuted}
            />
            <Button onClick={leaveSession} title="leave session">
              <PhoneOff />
            </Button>
          </div>
        </div>
      )}
      {/* Display participants list if the user is the host */}
      {isHost && (
        <>
          <div>
            <h2>Participants</h2>
            {participants.map( user => (
              <div key={user.userId} className="mt-4">
                {user.displayName}
                <div className="space-x-2">
                  <button onClick={() => removeParticipant(user.userId)}>Remove</button>
                  <button onClick={() => muteParticipant(user.userId)}>Mute</button>
                  <button onClick={() => unmuteParticipant(user.userId)}>Unmute</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={endSession}>End Session</button>
        </>
      )}
    </div>
  );
};

export default Videochat;

const videoPlayerStyle = {
  height: "75vh",
  marginTop: "1.5rem",
  marginLeft: "3rem",
  marginRight: "3rem",
  alignContent: "center",
  borderRadius: "10px",
  overflow: "hidden",
} as CSSProperties;

function isOriginalHost() {
  throw new Error("Function not implemented.");
}

