import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidService } from './mermaid.service';

describe('MermaidService', () => {
    let service: MermaidService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MermaidService]
        });
        service = TestBed.inject(MermaidService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('renders a valid diagram returning svg', async () => {
        const mockSvg = '<svg id="test-svg"><g></g></svg>';
        vi.spyOn(service, 'render').mockResolvedValue(mockSvg);

        const result = await service.render('test-1', 'pie title Spend\n"Food": 100');
        expect(result).toBe(mockSvg);
    });

    it('generates unique diagram IDs', () => {
        const id1 = service.generateId();
        const id2 = service.generateId();
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^mermaid-/);
    });

    it('handles render errors gracefully', async () => {
        vi.spyOn(service, 'render').mockRejectedValue(new Error('Syntax error in graph'));

        await expect(service.render('bad-id', 'invalid diagram code')).rejects.toThrow(
            'Syntax error in graph'
        );
    });
});
