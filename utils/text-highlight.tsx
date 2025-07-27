import React from 'react';

/**
 * Highlights search terms in text with a yellow background
 * @param text - The text to highlight
 * @param searchQuery - The search term to highlight
 * @returns JSX element with highlighted text
 */
export function highlightText(text: string, searchQuery: string): React.ReactNode {
  if (!text || !searchQuery || searchQuery.trim() === '') {
    return text;
  }

  const query = searchQuery.trim();
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <mark
              key={index}
              className="bg-yellow-200 text-yellow-900 px-1 rounded font-medium"
            >
              {part}
            </mark>
          );
        }
        return part;
      })}
    </>
  );
}

/**
 * Highlights search terms in HTML content
 * @param htmlContent - The HTML content to highlight
 * @param searchQuery - The search term to highlight
 * @returns Highlighted HTML string
 */
export function highlightHtmlContent(htmlContent: string, searchQuery: string): string {
  if (!htmlContent || !searchQuery || searchQuery.trim() === '') {
    return htmlContent;
  }

  const query = searchQuery.trim();
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  // Create a temporary div to parse HTML safely
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Function to highlight text nodes recursively
  function highlightTextNodes(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (regex.test(text)) {
        const highlightedText = text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded font-medium">$1</mark>');
        const wrapper = document.createElement('span');
        wrapper.innerHTML = highlightedText;
        node.parentNode?.replaceChild(wrapper, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Don't highlight inside certain elements like <code>, <pre>, etc.
      const element = node as Element;
      if (!['CODE', 'PRE', 'SCRIPT', 'STYLE'].includes(element.tagName)) {
        Array.from(node.childNodes).forEach(child => highlightTextNodes(child));
      }
    }
  }
  
  highlightTextNodes(tempDiv);
  return tempDiv.innerHTML;
}

/**
 * Highlights search terms in an array of tags
 * @param tags - Array of tag strings
 * @param searchQuery - The search term to highlight
 * @returns Array of JSX elements with highlighted tags
 */
export function highlightTags(tags: string[], searchQuery: string): React.ReactNode[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return tags;
  }

  return tags.map((tag, index) => highlightText(tag, searchQuery));
}
