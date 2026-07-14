import React from 'react';
import { Composition, Series } from 'remotion';
import { HomePage } from './scenes/HomePage';
import { SignupFlow } from './scenes/SignupFlow';
import { Dashboard } from './scenes/Dashboard';
import { ProjectDetail } from './scenes/ProjectDetail';
import { UploadPptx } from './scenes/UploadPptx';
import { VoiceSelection } from './scenes/VoiceSelection';
import { SlideEditorScene } from './scenes/SlideEditorScene';
import { AudioGeneration } from './scenes/AudioGeneration';
import { AudioPreview } from './scenes/AudioPreview';
import { ShareSettings } from './scenes/ShareSettings';
import { ViewerGate } from './scenes/ViewerGate';
import { ViewerVerification } from './scenes/ViewerVerification';
import { ViewerPlayer } from './scenes/ViewerPlayer';

const FPS = 30;

const DemoVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={5 * FPS} name="Home Page">
        <HomePage />
      </Series.Sequence>
      <Series.Sequence durationInFrames={4 * FPS} name="Signup Flow">
        <SignupFlow />
      </Series.Sequence>
      <Series.Sequence durationInFrames={5 * FPS} name="Dashboard">
        <Dashboard />
      </Series.Sequence>
      <Series.Sequence durationInFrames={4 * FPS} name="Project Detail">
        <ProjectDetail />
      </Series.Sequence>
      <Series.Sequence durationInFrames={7 * FPS} name="Upload PPTX">
        <UploadPptx />
      </Series.Sequence>
      <Series.Sequence durationInFrames={5 * FPS} name="Voice Selection">
        <VoiceSelection />
      </Series.Sequence>
      <Series.Sequence durationInFrames={6 * FPS} name="Slide Editor">
        <SlideEditorScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={5 * FPS} name="Audio Generation">
        <AudioGeneration />
      </Series.Sequence>
      <Series.Sequence durationInFrames={5 * FPS} name="Audio Preview">
        <AudioPreview />
      </Series.Sequence>
      <Series.Sequence durationInFrames={5 * FPS} name="Share Settings">
        <ShareSettings />
      </Series.Sequence>
      <Series.Sequence durationInFrames={4 * FPS} name="Viewer Gate">
        <ViewerGate />
      </Series.Sequence>
      <Series.Sequence durationInFrames={3 * FPS} name="Email Verification">
        <ViewerVerification />
      </Series.Sequence>
      <Series.Sequence durationInFrames={8 * FPS} name="Viewer Player">
        <ViewerPlayer />
      </Series.Sequence>
    </Series>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ModuvoxDemo"
        component={DemoVideo}
        durationInFrames={66 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};