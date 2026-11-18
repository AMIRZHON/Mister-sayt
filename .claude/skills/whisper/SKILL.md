---
name: whisper
description: Transcribe audio/video to text or SRT/VTT subtitles with Whisper (faster-whisper or openai-whisper), including word timestamps for captions. Use when the user asks for transcription, subtitles or captions.
---

# Whisper transcription

1. Extract audio: `ffmpeg -i in.mp4 -vn -ar 16000 -ac 1 audio.wav`
2. Transcribe (pick what is installed):
   - `whisper audio.wav --model small --output_format srt --word_timestamps True` (openai-whisper)
   - faster-whisper: `faster-whisper`/Python `WhisperModel("small").transcribe(path, word_timestamps=True)`
3. Kazakh/Russian/Uzbek: pass `--language kk|ru|uz`; use `medium` or larger for accuracy.
4. For Remotion captions, convert word timestamps to the Caption JSON format (see remotion-captions skill).

Install if missing: `pip install faster-whisper` or `pip install openai-whisper` (needs ffmpeg).
