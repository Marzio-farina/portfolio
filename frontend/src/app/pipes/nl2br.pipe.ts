import { Pipe, PipeTransform } from '@angular/core';

/**
 * Newline to Break Pipe
 * 
 * Converts newline characters (\n) to HTML <br> tags
 * for proper display of multi-line text content.
 */
@Pipe({
  name: 'nl2br',
  standalone: true
})
export class Nl2brPipe implements PipeTransform {
  /**
   * Transform newlines to HTML breaks
   * 
   * @param value Input string with newlines
   * @returns String with <br> tags instead of newlines
   */
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    
    return value
      .replace(/\n/g, '<br>')
      .replace(/\r\n/g, '<br>')
      .replace(/\r/g, '<br>');
  }
}
