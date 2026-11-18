---
name: ffmpeg
description: Generate accurate, efficient FFmpeg commands for video/audio tasks: cut, trim, concat, convert, compress, resize/crop to 9:16, extract audio, burn subtitles, speed up, remove silence, thumbnails. Use when the user asks to process media files with ffmpeg.
---

# FFmpeg

Rules: use `-y` only when overwriting is intended; quote paths; prefer `-c copy` for lossless cut/concat; re-encode with `-c:v libx264 -crf 20 -preset medium -c:a aac -movflags +faststart` otherwise. Show the command, then run it; verify with `ffprobe`.

Recipes:
- Trim: `ffmpeg -ss 00:00:05 -to 00:00:20 -i in.mp4 -c copy out.mp4`
- Vertical 1080x1920 crop: `ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" out.mp4`
- Extract audio: `ffmpeg -i in.mp4 -vn -ar 16000 -ac 1 audio.wav` (Whisper-ready)
- Burn subtitles: `ffmpeg -i in.mp4 -vf "subtitles=subs.srt" out.mp4`
- Compress: `ffmpeg -i in.mp4 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 128k out.mp4`
- Concat: list files in `list.txt` as `file 'a.mp4'`, then `ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4`
- Remove silence: `-af "silenceremove=stop_periods=-1:stop_duration=0.6:stop_threshold=-35dB"`
- Speed 1.25x: `-filter_complex "[0:v]setpts=PTS/1.25[v];[0:a]atempo=1.25[a]" -map "[v]" -map "[a]"`
- Loudness: `-af loudnorm=I=-14:TP=-1.5:LRA=11`
