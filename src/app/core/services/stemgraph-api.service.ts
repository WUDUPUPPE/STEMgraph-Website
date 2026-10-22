import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { Api } from '../../api/api';
import { databasecheckDatabasecheckGet, downloadAssetChallengesIdAssetsFileNameGet, getChallengeContentChallengesIdContentGet, getChallengesByKeywordListKeywordsChallengesListGet, getGraphGraphGet, getKeywordsGraphKeywordsGraphGet, getKeywordsListKeywordsListGet, getListListGet, healthcheckHealthcheckGet } from '../../api/functions';

/**
 * Dünne Schicht über dem generierten API-Client (api/).
 * Die Komponenten sprechen nur mit diesem Service und kennen die
 * generierten Funktionsnamen nicht.
 */
@Injectable({
  providedIn: 'root',
})

// Service, der die generierten API-Funktionen kapselt und als Observable zurückgibt
export class STEMgraphApiService {
  private readonly api = inject(Api);

  healthcheck() {
    return from(this.api.invoke(healthcheckHealthcheckGet));
  }

  databasecheck() {
    return from(this.api.invoke(databasecheckDatabasecheckGet));
  }

  mainGraph() {
    return from(this.api.invoke(getGraphGraphGet));
  }

  mainList() {
    return from(this.api.invoke(getListListGet));
  }

  keywordsGraph() {
    return from(this.api.invoke(getKeywordsGraphKeywordsGraphGet));
  }

  keywordsList() {
    return from(this.api.invoke(getKeywordsListKeywordsListGet));
  }

  // Alle Challenges, die ein bestimmtes Keyword haben
  keywordChallengesList(keyword: string) {
    return from(
      this.api.invoke(getChallengesByKeywordListKeywordsChallengesListGet, {
        kw: keyword,
      }),
    );
  }

  // Lädt den Inhalt einer Challenge (README.md) vom Server
  challengeContent(id: string) {
    return from(
      this.api.invoke(getChallengeContentChallengesIdContentGet, { id }),
    );
  }

  // Lädt eine Asset-Datei einer Challenge vom Server
  downloadAsset(id: string, fileName: string) {
    return from(
      this.api.invoke(downloadAssetChallengesIdAssetsFileNameGet, {
        id,
        file_name: fileName,
      }),
    );
  }
}
