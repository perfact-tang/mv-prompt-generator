/**
 * MV Structure Generator
 * 
 * Usage: node structure_generator.js <path_to_lrc> <path_to_proposal_json> <output_path>
 */

const fs = require('fs');

function parseTime(timeStr) {
    // Format: "MM:SS" or "MM:SS.xx"
    const parts = timeStr.split(':');
    const min = parseFloat(parts[0]);
    const sec = parseFloat(parts[1]);
    return min * 60 + sec;
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function parseLRC(lrcContent) {
    const lines = lrcContent.split('\n');
    const lyrics = [];
    const regex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const min = parseFloat(match[1]);
            const sec = parseFloat(match[2]);
            const text = match[3].trim();
            if (text) {
                lyrics.push({
                    time: min * 60 + sec,
                    text: text
                });
            }
        }
    }
    return lyrics;
}

function getLyricsForRange(lyrics, start, end) {
    return lyrics
        .filter(l => l.time >= start && l.time < end)
        .map(l => l.text)
        .join(' ');
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: node structure_generator.js <lrc_file> <proposal_file> <output_file>");
        process.exit(1);
    }

    const lrcPath = args[0];
    const proposalPath = args[1];
    const outputPath = args[2];

    try {
        const lrcContent = fs.readFileSync(lrcPath, 'utf-8');
        const proposalContent = fs.readFileSync(proposalPath, 'utf-8');
        const proposal = JSON.parse(proposalContent);
        const lyrics = parseLRC(lrcContent);

        if (!proposal.storyboard) {
            console.error("Invalid proposal format: missing storyboard");
            process.exit(1);
        }

        for (const segment of proposal.storyboard) {
            if (!segment.movielength) {
                console.warn(`Segment ${segment.segment_id} missing movielength, skipping logic generation.`);
                continue;
            }

            const [startStr, endStr] = segment.movielength.split('-');
            const startTime = parseTime(startStr);
            const endTime = parseTime(endStr);
            const duration = endTime - startTime;
            
            // Fixed 5s chunks
            const chunkDuration = 5;
            const numChunks = Math.ceil(duration / chunkDuration);
            
            segment.mvinfo = [];

            for (let i = 0; i < numChunks; i++) {
                const chunkStart = startTime + (i * chunkDuration);
                let chunkEnd = chunkStart + chunkDuration;
                if (chunkEnd > endTime) chunkEnd = endTime;

                const chunkLyrics = getLyricsForRange(lyrics, chunkStart, chunkEnd);
                const isFirst = (i === 0);

                const mvItem = {
                    timestamp: `${formatTime(chunkStart)} - ${formatTime(chunkEnd)}`,
                    type: isFirst ? "New_Scene" : "Last_Frame_Continuity",
                    lyrics: chunkLyrics || "(No lyrics)",
                    // Placeholders for AI to fill
                    image_prompt: isFirst ? "[GENERATE T2I PROMPT HERE]" : undefined,
                    video_prompt: "[GENERATE I2V PROMPT HERE]"
                };
                
                segment.mvinfo.push(mvItem);
            }
        }

        fs.writeFileSync(outputPath, JSON.stringify(proposal, null, 2));
        console.log(`Successfully generated structure to ${outputPath}`);

    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

main();
