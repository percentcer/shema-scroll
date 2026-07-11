const base = import.meta.env.BASE_URL;

export const SCROLL_FONT = 'StamAshkenazCLM';
export const POINTED_FONT = 'TaameyFrankCLM';
export const UI_FONT = 'Rubik';

const FACES: Array<[family: string, file: string, weight?: string]> = [
  [SCROLL_FONT, 'StamAshkenazCLM.ttf'],
  [POINTED_FONT, 'TaameyFrankCLM-Medium.ttf'],
  [UI_FONT, 'Rubik-Regular.ttf', '400'],
  [UI_FONT, 'Rubik-Medium.ttf', '500'],
  [UI_FONT, 'Rubik-Bold.ttf', '700'],
];

/**
 * Fonts MUST be registered before any canvas text measurement — measuring
 * with a fallback font would corrupt every word rect in the bake.
 */
export async function loadFonts(): Promise<void> {
  await Promise.all(
    FACES.map(async ([family, file, weight]) => {
      const face = new FontFace(family, `url(${base}fonts/${file})`, { weight: weight ?? 'normal' });
      await face.load();
      document.fonts.add(face);
    }),
  );
}
