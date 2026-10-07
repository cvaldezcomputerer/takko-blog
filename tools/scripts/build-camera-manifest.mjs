/**
 * Build the camera manifest read by the post lightbox.
 *
 * Astro's sharp image service strips EXIF when it generates the avif/webp
 * variants, so the camera model can never be read in the browser. This walks
 * the source images instead and writes what it finds to a JSON file that
 * BlogPost.astro imports at build time.
 *
 * Only headers are read (sharp().metadata() does not decode pixels), so the
 * whole library scans in well under a second. The output is committed, so a
 * normal build does not depend on this having run.
 *
 *   node tools/scripts/build-camera-manifest.mjs
 *   node tools/scripts/build-camera-manifest.mjs --check   (CI: fail if stale)
 *
 * Shape: { "<post-folder>": { "<file-stem>": { "model": "...", "lens": "..." } } }
 * The stem is the lookup key because that is what survives into the built
 * filename (`<stem>.<hash>_<hash>.avif`).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import exifReader from 'exif-reader';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IMAGE_ROOT = join(ROOT, 'src/assets/images/blog');
const OUT_FILE = join(ROOT, 'src/data/camera-manifest.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.heic']);

/**
 * Camera bodies write their model in shouty catalogue form. Map the ones this
 * blog actually owns to how a person would write them; anything unrecognised
 * falls through to a light generic tidy so a new camera still shows up.
 */
const MODEL_NAMES = {
	'NIKON D3300': 'Nikon D3300',
	'Canon PowerShot S90': 'Canon PowerShot S90',
	'ILCE-6300': 'Sony A6300',
};

/** @param {string} raw */
function tidyModel(raw) {
	const model = raw.trim().replace(/\s+/g, ' ');
	if (!model) return '';
	if (MODEL_NAMES[model]) return MODEL_NAMES[model];
	// e.g. "NIKON D5600" -> "Nikon D5600", but leave "iPhone 17" alone
	return model.replace(/^([A-Z]{3,})(?=\s)/, (word) => word[0] + word.slice(1).toLowerCase());
}

/**
 * Lenses write their catalogue name too, and Sony bodies leave the maker off
 * third-party glass entirely. Same idea as MODEL_NAMES: map the owned lenses,
 * pass anything new through as written.
 */
const LENS_NAMES = {
	'E 50mm F1.8 OSS': 'Sony 50mm f/1.8',
	'18-50mm F2.8 DC DN | Contemporary 021': 'Sigma 18-50mm f/2.8',
};

/** @param {import('exif-reader').Exif} exif */
function readLens(exif) {
	const photo = exif.Photo ?? {};
	const raw = photo.LensModel ?? photo.LensMake ?? '';
	if (typeof raw !== 'string') return '';
	const lens = raw.trim().replace(/\s+/g, ' ');
	return LENS_NAMES[lens] ?? lens;
}

/** @param {string} file */
async function readCamera(file) {
	let meta;
	try {
		meta = await sharp(file).metadata();
	} catch {
		return null; // not something sharp can open; not our problem here
	}
	if (!meta.exif) return null;

	let exif;
	try {
		exif = exifReader(meta.exif);
	} catch {
		return null; // malformed EXIF block
	}

	const model = tidyModel(exif.Image?.Model ?? '');
	const lens = readLens(exif);
	if (!model && !lens) return null;

	const entry = { model };
	// Only images that kept their lens tag get one; the lightbox hides the
	// lens line when it is absent.
	if (lens) entry.lens = lens;
	return entry;
}

async function build() {
	/** @type {Record<string, Record<string, { model: string, lens?: string }>>} */
	const manifest = {};
	let scanned = 0;

	const postDirs = (await readdir(IMAGE_ROOT, { withFileTypes: true }))
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();

	for (const post of postDirs) {
		const files = (await readdir(join(IMAGE_ROOT, post), { withFileTypes: true }))
			.filter((d) => d.isFile())
			.map((d) => d.name)
			.sort();

		/** @type {Record<string, { model: string, lens?: string }>} */
		const entries = {};
		for (const name of files) {
			const { name: stem, ext } = parse(name);
			if (!IMAGE_EXT.has(ext.toLowerCase())) continue;
			scanned += 1;

			const camera = await readCamera(join(IMAGE_ROOT, post, name));
			if (!camera) continue;
			// Two source files can share a stem (e.g. foo.jpg + foo.png). They
			// collide in the built filename too, so last-in wins either way.
			entries[stem] = camera;
		}

		if (Object.keys(entries).length) manifest[post] = entries;
	}

	return { manifest, scanned };
}

const started = Date.now();
const { manifest, scanned } = await build();
const json = JSON.stringify(manifest, null, '\t') + '\n';

const withCamera = Object.values(manifest).reduce((n, post) => n + Object.keys(post).length, 0);

if (process.argv.includes('--check')) {
	const current = await readFile(OUT_FILE, 'utf8').catch(() => '');
	if (current !== json) {
		console.error('camera manifest is out of date — run: node tools/scripts/build-camera-manifest.mjs');
		process.exit(1);
	}
	console.log(`camera manifest up to date (${withCamera}/${scanned} images)`);
} else {
	await writeFile(OUT_FILE, json);
	console.log(
		`camera manifest: ${withCamera}/${scanned} images have a model, ` +
			`${Object.keys(manifest).length} posts, ${Date.now() - started}ms`,
	);
}
