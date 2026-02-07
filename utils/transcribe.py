import sys
import whisper

audio_path = sys.argv[1]

model = whisper.load_model("base")  # base = good balance
result = model.transcribe(audio_path)

print(result["text"])
