import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DocumentModal from './DocumentModal.jsx';

const studyGuideDoc = {
  title: 'Intro to AI',
  sections: [
    {
      heading: 'Chapter 1',
      bullets: ['Point A', 'Point B'],
      keyTerms: [{ term: 'Neural Net', definition: 'A model inspired by the brain' }],
      reviewQuestions: ['What is AI?'],
    },
  ],
  mnemonics: ['AI = Always Iterating'],
};

const faqDoc = {
  subject: 'Machine Learning',
  faqPairs: [
    { question: 'What is ML?', answer: 'A subset of AI.' },
    { question: 'Why use ML?', answer: 'To find patterns in data.' },
  ],
};

const execBriefDoc = {
  title: 'Q4 Strategy',
  sections: [
    { subhead: 'Revenue', prose: 'Revenue grew 20%.' },
    { subhead: 'Outlook', prose: 'Positive outlook for next quarter.' },
  ],
};

describe('DocumentModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <DocumentModal open={false} onClose={() => {}} type="faq" document={faqDoc} loading={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows loading state with doc type label', () => {
    render(
      <DocumentModal open={true} onClose={() => {}} type="study-guide" document={null} loading={true} />,
    );
    expect(screen.getByText(/Generating Study Guide/)).toBeInTheDocument();
  });

  it('shows loading state for FAQ', () => {
    render(
      <DocumentModal open={true} onClose={() => {}} type="faq" document={null} loading={true} />,
    );
    expect(screen.getByText(/Generating F\.A\.Q\./)).toBeInTheDocument();
  });

  it('shows loading state for Executive Brief', () => {
    render(
      <DocumentModal open={true} onClose={() => {}} type="executive-brief" document={null} loading={true} />,
    );
    expect(screen.getByText(/Generating Executive Brief/)).toBeInTheDocument();
  });

  describe('StudyGuideContent', () => {
    it('renders title and section heading', () => {
      render(
        <DocumentModal open={true} onClose={() => {}} type="study-guide" document={studyGuideDoc} loading={false} />,
      );
      expect(screen.getByText('Intro to AI')).toBeInTheDocument();
      expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    });

    it('renders bullets', () => {
      render(
        <DocumentModal open={true} onClose={() => {}} type="study-guide" document={studyGuideDoc} loading={false} />,
      );
      expect(screen.getByText('Point A')).toBeInTheDocument();
      expect(screen.getByText('Point B')).toBeInTheDocument();
    });

    it('renders key terms', () => {
      render(
        <DocumentModal open={true} onClose={() => {}} type="study-guide" document={studyGuideDoc} loading={false} />,
      );
      expect(screen.getByText('Neural Net')).toBeInTheDocument();
      expect(screen.getByText('A model inspired by the brain')).toBeInTheDocument();
    });

    it('renders review questions', () => {
      render(
        <DocumentModal open={true} onClose={() => {}} type="study-guide" document={studyGuideDoc} loading={false} />,
      );
      expect(screen.getByText('What is AI?')).toBeInTheDocument();
    });

    it('renders mnemonics', () => {
      render(
        <DocumentModal open={true} onClose={() => {}} type="study-guide" document={studyGuideDoc} loading={false} />,
      );
      expect(screen.getByText('AI = Always Iterating')).toBeInTheDocument();
    });
  });

  describe('FaqContent', () => {
    it('renders subject and Q&A pairs', () => {
      render(
        <DocumentModal open={true} onClose={() => {}} type="faq" document={faqDoc} loading={false} />,
      );
      expect(screen.getByText('FAQ: Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Q: What is ML?')).toBeInTheDocument();
      expect(screen.getByText('A subset of AI.')).toBeInTheDocument();
      expect(screen.getByText('Q: Why use ML?')).toBeInTheDocument();
    });
  });

  describe('ExecBriefContent', () => {
    it('renders title and sections', () => {
      render(
        <DocumentModal open={true} onClose={() => {}} type="executive-brief" document={execBriefDoc} loading={false} />,
      );
      expect(screen.getByText('Q4 Strategy')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Revenue grew 20%.')).toBeInTheDocument();
      expect(screen.getByText('Outlook')).toBeInTheDocument();
    });
  });

  it('renders Close button when not loading', () => {
    render(
      <DocumentModal open={true} onClose={() => {}} type="faq" document={faqDoc} loading={false} />,
    );
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('does not render Close button when loading', () => {
    render(
      <DocumentModal open={true} onClose={() => {}} type="faq" document={null} loading={true} />,
    );
    expect(screen.queryByText('Close')).toBeNull();
  });
});
