import json

transcript_path = r"C:\Users\Hi\.gemini\antigravity\brain\50f99aeb-5137-47d5-aca0-a09cf72012b2\.system_generated\logs\transcript_full.jsonl"
output_file = r"d:\Hacom\OCR\OCR\dump.txt"

out = []
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if "tool_calls" in data:
                for call in data["tool_calls"]:
                    if call["name"] in ["replace_file_content", "multi_replace_file_content"]:
                        args = call["args"]
                        if "App.jsx" in args.get("TargetFile", ""):
                            chunks = args.get("ReplacementChunks", [])
                            if not chunks:
                                if "TargetContent" in args:
                                    chunks = [args]
                            for chunk in chunks:
                                out.append("========== REPLACEMENT CONTENT ==========")
                                out.append(chunk["ReplacementContent"])
        except:
            pass

with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(out))
