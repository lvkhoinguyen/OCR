import json
import re

transcript_path = r"C:\Users\Hi\.gemini\antigravity\brain\50f99aeb-5137-47d5-aca0-a09cf72012b2\.system_generated\logs\transcript_full.jsonl"
original_app = r"d:\Hacom\OCR\extract\IDP.DMS.Client\src\App.jsx"
output_app = r"d:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client\src\App.jsx_recovered"

with open(original_app, "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split('\n')

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
                            # Sort chunks by StartLine descending so we can apply them without offsetting early lines
                            chunks.sort(key=lambda x: x["StartLine"], reverse=True)
                            
                            for chunk in chunks:
                                start = chunk["StartLine"] - 1
                                end = chunk["EndLine"]
                                target = chunk["TargetContent"]
                                repl = chunk["ReplacementContent"]
                                
                                # Replace the lines
                                content_slice = "\n".join(lines[start:end])
                                # Find target in content_slice
                                if target in content_slice:
                                    content_slice = content_slice.replace(target, repl)
                                    # Update lines
                                    new_lines_chunk = content_slice.split('\n')
                                    lines[start:end] = new_lines_chunk
                                else:
                                    print(f"Warning: target not found at {start}-{end}")
        except Exception as e:
            pass

with open(output_app, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Recovery completed. Lines:", len(lines))
