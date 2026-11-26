# Optional local alignment

Read this only when choosing local audio alignment, for example when the agent client cannot expose audio content. The core skill does not require these packages. A local aligner measures timing against supplied text; it cannot establish that supplied lyrics are correct or create their translation. Keep those decisions with the agent and distinguish automatic alignment from listening.

One tested Linux CPU route uses Python 3.12, PyTorch/TorchAudio 2.8, NumPy and uroman with MMS_FA. TorchAudio removed this alignment API in later versions, so keep these versions together in an isolated environment. Inspect the chosen interpreter by importing `torch`, `torchaudio`, `numpy`, `uroman` and checking that `torchaudio.pipelines.MMS_FA` exists. If the environment or packages are absent, show the user the commands below, substituting their chosen persistent path. Never report the route ready solely because another Python installation has torch.

```sh
python3.12 -m venv "$HOME/.local/share/runrun-karaoke-align"
"$HOME/.local/share/runrun-karaoke-align/bin/python" -m pip install torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cpu
"$HOME/.local/share/runrun-karaoke-align/bin/python" -m pip install numpy uroman
```

If Python 3.12 or venv/pip is missing, detect the distribution and verify its package availability before providing the appropriate system installation command. An existing `uv` installation can create/install into the same environment without system pip. Do not silently install or replace global Python packages.

The first `torchaudio.pipelines.MMS_FA.get_model()` downloads approximately 1.2 GB of model weights into the local torch cache; disclose this before running it if absent. This is a model download, not an audio upload. Review the model's license for the intended use. It is optional and is not bundled in the extension or installed by MCP.

Reuse the `prepare_audio` result, convert locally with FFmpeg to mono 16 kHz, and align within verified line windows. Japanese needs meaningful segmentation and romanization; use correct existing furigana to disambiguate spoken readings. Keep a mapping from each romanized token back to its exact original text. Use acoustic token spans for start/end; do not divide the line evenly. Convert audio positions to project time exactly once. Keep score/uncertainty notes, and leave failed alignments unswept. Low acoustic scores are review signals, not calibrated accuracy percentages. The caller should review repeats, short particles and fade-outs especially carefully.

See the official [multilingual alignment tutorial](https://docs.pytorch.org/audio/2.8.0/tutorials/forced_alignment_for_multilingual_data_tutorial.html) and [MMS_FA model documentation](https://docs.pytorch.org/audio/2.8.0/generated/torchaudio.pipelines.MMS_FA.html) for model usage and licensing. Do not claim to have heard the audio merely because this model produced spans.
