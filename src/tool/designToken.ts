import { Dictionary } from '../core/types';
import { extend, map } from '../core/util';
import type { GradientObject } from '../graphic/Gradient';
import type { PatternObject } from '../graphic/Pattern';
import { CommonStyleProps } from '../graphic/Displayable';

export type DesignTokenValue = string | number;
export interface DesignTokens {
    [key: string]: {
        [key: string]: DesignTokenValue | string  // Allow string for token references
    }
}

export class DesignTokenManager {
    private _designTokens: DesignTokens = {};
    private _resolvedTokens: Dictionary<DesignTokenValue> = {};

    /**
     * Register design tokens for theming
     * @param tokens Design tokens object
     */
    registerTokens(tokens: DesignTokens) {
        this._designTokens = extend({}, tokens);
        this._resolveTokens();
    }

    /**
     * Get the resolved value of a design token
     * @param token Token reference (e.g. '@border')
     * @returns Resolved value or the original token if not found
     */
    getTokenValue(token: string): DesignTokenValue | string {
        if (typeof token !== 'string' || !token.startsWith('@')) {
            return token;
        }
        const key = token.slice(1); // Remove '@' prefix
        return this._resolvedTokens[key] ?? token;
    }

    /**
     * Resolve color value, handling design tokens
     * @param color Color value or token reference
     */
    resolveColor(color: string | GradientObject | PatternObject): string | GradientObject | PatternObject {
        if (!color) {
            return color;
        }

        if (typeof color === 'string') {
            return this.getTokenValue(color) as string;
        }
        else if ((color as GradientObject).colorStops) {
            const gradient = extend({}, color) as GradientObject;
            gradient.colorStops = map(gradient.colorStops, stop => {
                const newStop = extend({}, stop);
                newStop.color = this.getTokenValue(stop.color) as string;
                return newStop;
            });
            return gradient;
        }
        return color;
    }

    /**
     * Get the resolved style for painting
     */
    getPaintStyle(style: Dictionary<any>): Dictionary<any> {
        if (!style) {
            return style;
        }
        const paintStyle = extend({}, style);

        if (style.fill != undefined) {
            paintStyle.fill = this.resolveColor(style.fill);
        }
        if (style.stroke != undefined) {
            paintStyle.stroke = this.resolveColor(style.stroke);
        }

        return paintStyle;
    }

    /**
     * Resolve style object with design tokens
     */
    resolveStyle(style: Dictionary<any>): Dictionary<any> {
        const resolvedStyle = extend({}, style);

        if (style.fill) {
            resolvedStyle.fill = this.resolveColor(style.fill);
        }
        if (style.stroke) {
            resolvedStyle.stroke = this.resolveColor(style.stroke);
        }

        return resolvedStyle;
    }

    private _resolveTokens() {
        this._resolvedTokens = {};
        // Iterate through all token categories
        Object.keys(this._designTokens).forEach(category => {
            const tokens = this._designTokens[category];
            Object.keys(tokens).forEach(key => {
                const value = tokens[key];
                this._resolvedTokens[key] = this._resolveTokenValue(value);
            });
        });
    }

    private _resolveTokenValue(value: DesignTokenValue | string): DesignTokenValue {
        if (typeof value !== 'string' || !value.startsWith('@')) {
            return value as DesignTokenValue;
        }

        const tokenKey = value.slice(1);
        // Find the referenced token
        for (const category of Object.values(this._designTokens)) {
            if (tokenKey in category) {
                const referencedValue = category[tokenKey];
                // Recursively resolve referenced tokens
                return this._resolveTokenValue(referencedValue);
            }
        }
        return value; // Return original value if token not found
    }
}
