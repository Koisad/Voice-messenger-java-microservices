import {
    LayoutContextProvider,
    RoomAudioRenderer,
    useTracks,
    GridLayout,
    ParticipantTile,
    TrackToggle,
    DisconnectButton,
    MediaDeviceMenu,
    StartAudio,
    ConnectionStateToast
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import './CustomVideoConference.css';

export function CustomVideoConference() {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    return (
        <LayoutContextProvider>
            <div className="lk-video-conference">
                <div className="lk-video-conference-inner">
                    <GridLayout tracks={tracks}>
                        <ParticipantTile />
                    </GridLayout>
                    <CustomControlBar />
                </div>
                <RoomAudioRenderer />
                <ConnectionStateToast />
            </div>
        </LayoutContextProvider>
    );
}

function CustomControlBar() {
    return (
        <div className="lk-control-bar">
            <div className="lk-button-group">
                <TrackToggle source={Track.Source.Microphone} showIcon={true}>
                    Mikrofon
                </TrackToggle>
                <div className="lk-button-menu-trigger">
                    <MediaDeviceMenu kind="audioinput" />
                </div>
            </div>

            <div className="lk-button-group">
                <TrackToggle source={Track.Source.Camera} showIcon={true}>
                    Kamera
                </TrackToggle>
                <div className="lk-button-menu-trigger">
                    <MediaDeviceMenu kind="videoinput" />
                </div>
            </div>

            <div className="lk-button-group">
                <TrackToggle source={Track.Source.ScreenShare} showIcon={true}>
                    Ekran
                </TrackToggle>
            </div>

            <DisconnectButton>
                Opuść
            </DisconnectButton>

            <StartAudio label="Kliknij, aby włączyć dźwięk" />
        </div>
    );
}
