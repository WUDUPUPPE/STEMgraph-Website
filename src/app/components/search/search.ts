import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { STEMgraphApiService } from "../../service/stemgraph-api.service";
import { GraphSelectionService } from "../../service/graph-selection.service";

type SearchType = "challenges" | "keywords" | "chall-by-key" | "dependencies" | "subgraph";

interface ChallengeSuggestion {
  id: string;
  teaches: string;
  keywords: string[];
}

@Component({
  selector: "app-search",
  imports: [FormsModule],
  templateUrl: "./search.html",
  styleUrl: "./search.css",
})

export class Search implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(STEMgraphApiService);
  private readonly graphSelection = inject(GraphSelectionService);

  searchTerm = "";
  searchType: SearchType = "challenges";

  suggestions: string[] = [];
  private challenges: ChallengeSuggestion[] = [];
  private keywords: string[] = [];

  ngOnInit(): void {
    forkJoin({
      challenges: this.api.MainList(),
      keywords: this.api.KeywordsList(),
    }).subscribe({
      next: ({ challenges, keywords }) => {
        this.challenges = challenges as ChallengeSuggestion[];
        this.keywords = keywords.keywords ?? [];
      },
      error: (error) => {
        console.error("Autocomplete-Daten can´t load:", error);
      },
    });
  };

  updateSuggestions(): void {
    const query = this.searchTerm.trim().toLowerCase();

    if(!query) {
      this.suggestions =[];
      return;
    }

    if (this.searchType === "keywords" || this.searchType === "chall-by-key") {
      this.suggestions = this.keywords
        .filter((keyword) => keyword.toLowerCase().includes(query))
        .slice(0, 8);
      return;
    }

    this.suggestions = this.challenges
      .filter((challenge) => challenge.teaches?.toLowerCase().includes(query))
      .slice(0, 8)
      .map((challenge) => challenge.teaches);
  };

  selectSuggestion(suggestion: string): void {
    this.searchTerm = suggestion;
    this.suggestions = [];

    if (this.searchType === "challenges") {
      const challenge = this.findChallenge(suggestion);

      if (challenge) {
        this.openChallengeInGraph(challenge.id);
      }
    }
  };

  private openChallengeInGraph(id: string): void {
    this.graphSelection.selectChallenge(id);
  };

  private openDependencies(id: string): void {
    this.router.navigate(["/"], {
      queryParams: { dependency: id },
    });
  };


  submitSearch(): void {
    const query = this.searchTerm.trim();

    if (!query) {
      return;
    }

    switch (this.searchType) {
      case "keywords":
        this.router.navigate(["/keywords"], {
          queryParams: { kw: query },
        });
        break;

      case "chall-by-key":
        this.router.navigate(["/challenges"], {
          queryParams: { kw: query },
        });
        break;

      case "dependencies":
        const challenge = this.findChallenge(query);

        if (!challenge) {
          console.warn("Dependencies not found:", query);
          return;
        }

        this.router.navigate(["/challenges"], {
          queryParams: { dependency: challenge.id },
        });
        break;

      case "subgraph":
        //Eingabewert ist der Startwert bzw Start-ID
        this.router.navigate(["/challenges"], {
          queryParams: { start: query },
        });
        break;

      case "challenges": {
        const challenge = this.findChallenge(query);

        if (!challenge) {
          console.warn("Challenge not found:", query);
          return;
        }

        this.openChallengeInGraph(challenge.id);
        break;
      }
    }

    this.suggestions = [];
  };

  private findChallenge(query: string): ChallengeSuggestion | undefined {
    const normalized = query.toLowerCase();

    return this.challenges.find(
      (challenge) =>
        challenge.id.toLowerCase() === normalized ||
        challenge.teaches.toLowerCase() === normalized,
    );
  };
}