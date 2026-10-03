from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(
        extra="allow",
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class Team(ApiModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    seed: int = Field(ge=1)


class Stream(ApiModel):
    url: str | None = None
    team1: str | None = None
    team2: str | None = None
    score1: int | None = Field(default=None, ge=0)
    score2: int | None = Field(default=None, ge=0)
    format: str | None = None


class MatchResult(ApiModel):
    winner_id: str | None = Field(default=None, alias="winnerId")
    scores: tuple[int, int] | None = None
    status: Literal["live", "completed"] | None = None

    @model_validator(mode="after")
    def validate_result_state(self) -> "MatchResult":
        if self.status == "live" and self.winner_id is not None:
            raise ValueError("A live match cannot have winnerId")
        if self.status != "live" and self.winner_id is None:
            raise ValueError("A completed match must have winnerId")
        if self.scores is not None:
            if any(score < 0 for score in self.scores):
                raise ValueError("Match scores cannot be negative")
            if self.status != "live" and self.scores[0] == self.scores[1]:
                raise ValueError("A completed match cannot end in a draw")
        return self


class MatchMap(ApiModel):
    name: str = Field(min_length=1)
    status: Literal["scheduled", "live", "completed"] = "scheduled"
    scores: tuple[int, int] | None = None

    @model_validator(mode="after")
    def validate_scores(self) -> "MatchMap":
        if self.scores is not None and any(score < 0 for score in self.scores):
            raise ValueError("Map scores cannot be negative")
        if self.status == "completed" and self.scores is None:
            raise ValueError("A completed map must have scores")
        if self.status == "scheduled" and self.scores is not None:
            raise ValueError("A scheduled map cannot have scores")
        return self


class MatchPlayer(ApiModel):
    name: str = Field(min_length=1)
    team_id: str = Field(alias="teamId", min_length=1)
    kills: int = Field(ge=0)
    deaths: int = Field(ge=0)
    adr: float = Field(ge=0)
    kast: float = Field(ge=0, le=100)
    rating: float = Field(ge=0)


class MatchBroadcast(ApiModel):
    url: str | None = None
    commentator: str | None = None
    viewers: int | None = Field(default=None, ge=0)


class NextMatch(ApiModel):
    stage: str = Field(min_length=1)
    description: str | None = None
    team1: str | None = None
    team2: str | None = None


class MatchDetail(ApiModel):
    hidden: bool = False
    stage: str = Field(min_length=1)
    starts_at: str | None = Field(default=None, alias="startsAt")
    status: Literal["scheduled", "live", "completed"] = "scheduled"
    team1_id: str = Field(alias="team1Id", min_length=1)
    team2_id: str = Field(alias="team2Id", min_length=1)
    scores: tuple[int, int] | None = None
    best_of: int = Field(alias="bestOf", ge=1, le=9)
    maps: list[MatchMap] = Field(default_factory=list)
    current_round: int | None = Field(default=None, alias="currentRound", ge=1)
    total_rounds: int | None = Field(default=None, alias="totalRounds", ge=1)
    players: list[MatchPlayer] = Field(default_factory=list)
    broadcast: MatchBroadcast | None = None
    next_match: NextMatch | None = Field(default=None, alias="nextMatch")

    @model_validator(mode="after")
    def validate_match(self) -> "MatchDetail":
        if self.team1_id == self.team2_id:
            raise ValueError("A match requires two different teams")
        if self.scores is not None and any(score < 0 for score in self.scores):
            raise ValueError("Match scores cannot be negative")
        if len(self.maps) > self.best_of:
            raise ValueError("Map count cannot exceed bestOf")
        if self.current_round is not None and self.total_rounds is not None and self.current_round > self.total_rounds:
            raise ValueError("currentRound cannot exceed totalRounds")
        return self


class TournamentTerms(ApiModel):
    starts_on: date = Field(alias="startsOn")
    ends_on: date = Field(alias="endsOn")
    registration_closes_at: datetime = Field(alias="registrationClosesAt")
    entry_fee: int = Field(alias="entryFee", ge=0)
    minimum_teams: int = Field(alias="minimumTeams", ge=2)
    prize_distribution: dict[str, int] = Field(alias="prizeDistribution")

    @field_validator("registration_closes_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Registration deadline must include a timezone")
        return value

    @model_validator(mode="after")
    def validate_terms(self) -> "TournamentTerms":
        if self.ends_on < self.starts_on:
            raise ValueError("Дата окончания не может быть раньше начала турнира")
        if self.registration_closes_at.date() > self.starts_on:
            raise ValueError("Регистрация должна завершиться до начала турнира")
        if set(self.prize_distribution) != {"first", "second", "third", "organization"}:
            raise ValueError("Укажите доли трёх призовых мест и организатора")
        if any(value < 0 or value > 100 for value in self.prize_distribution.values()) or sum(self.prize_distribution.values()) != 100:
            raise ValueError("Сумма всех долей должна быть 100%")
        return self


class ContentStep(ApiModel):
    title: str = Field(min_length=1, max_length=150)
    text: str = Field(min_length=1, max_length=3000)


class ContentFaq(ApiModel):
    question: str = Field(min_length=1, max_length=300)
    answer: list[str] = Field(min_length=1)


class SiteContent(ApiModel):
    hero_lead: str | None = Field(default=None, alias="heroLead", max_length=1000)
    hero_description: str | None = Field(default=None, alias="heroDescription", max_length=3000)
    preflight_text: str | None = Field(default=None, alias="preflightText", max_length=3000)
    broadcast_text: str | None = Field(default=None, alias="broadcastText", max_length=3000)
    organizer_url: str | None = Field(default=None, alias="organizerUrl", max_length=1000)
    organizer_label: str | None = Field(default=None, alias="organizerLabel", max_length=150)
    participation_steps: list[ContentStep] | None = Field(default=None, alias="participationSteps")
    participation_cards: list[ContentStep] | None = Field(default=None, alias="participationCards")
    faq_items: list[ContentFaq] | None = Field(default=None, alias="faqItems")


class Tournament(ApiModel):
    title: str = Field(min_length=1)
    prize_pool: str | None = Field(default=None, alias="prizePool")
    reset_final: bool = Field(default=True, alias="resetFinal")
    teams: list[Team] = Field(min_length=1)
    terms: TournamentTerms | None = None
    content: SiteContent | None = None
    stream: Stream | None = None
    results: dict[str, MatchResult] = Field(default_factory=dict)
    matches: dict[str, MatchDetail] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_teams(self) -> "Tournament":
        team_ids = [team.id for team in self.teams]
        if len(team_ids) != len(set(team_ids)):
            raise ValueError("Team ids must be unique")

        seeds = [team.seed for team in self.teams]
        expected_seeds = set(range(1, len(self.teams) + 1))
        if set(seeds) != expected_seeds or len(seeds) != len(set(seeds)):
            raise ValueError("Team seeds must be unique and cover values from 1 to team count")

        known_team_ids = set(team_ids)
        unknown_winners = {
            result.winner_id
            for result in self.results.values()
            if result.winner_id is not None and result.winner_id not in known_team_ids
        }
        if unknown_winners:
            names = ", ".join(sorted(unknown_winners))
            raise ValueError(f"Unknown winnerId values: {names}")
        for match_id, match in self.matches.items():
            if match.team1_id not in known_team_ids or match.team2_id not in known_team_ids:
                raise ValueError(f"Match {match_id} references an unknown team")
            if any(player.team_id not in {match.team1_id, match.team2_id} for player in match.players):
                raise ValueError(f"Match {match_id} has a player from another team")
        return self


class TournamentPatch(ApiModel):
    title: str | None = Field(default=None, min_length=1)
    prize_pool: str | None = Field(default=None, alias="prizePool")
    reset_final: bool | None = Field(default=None, alias="resetFinal")
    teams: list[Team] | None = Field(default=None, min_length=1)
    terms: TournamentTerms | None = None
    content: SiteContent | None = None
    stream: Stream | None = None
    results: dict[str, MatchResult] | None = None
    matches: dict[str, MatchDetail] | None = None


class MatchResponse(ApiModel):
    tournament: Tournament
    match: MatchDetail


class UpdateResponse(ApiModel):
    message: str
    tournament: Tournament


class RegistrationCreate(ApiModel):
    team_name: str = Field(alias="teamName", min_length=2, max_length=80)
    captain_name: str = Field(alias="captainName", min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    contact: str = Field(min_length=2, max_length=100)
    players: int = Field(ge=5, le=7)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        local, separator, domain = value.rpartition("@")
        if not separator or not local or "." not in domain:
            raise ValueError("Enter a valid email address")
        return value.lower()


class Registration(RegistrationCreate):
    id: str
    created_at: str = Field(alias="createdAt")
    status: Literal["pending", "approved", "rejected", "yes", "waitpay"] = "pending"


class PublicRegistration(ApiModel):
    id: str
    team_name: str = Field(alias="teamName")
    players: int
    created_at: str = Field(alias="createdAt")
    status: Literal["pending", "approved", "rejected", "yes", "waitpay"]


class RegistrationResponse(ApiModel):
    message: str
    registration: Registration


class RegistrationStatusPatch(ApiModel):
    status: Literal["pending", "approved", "rejected", "yes", "waitpay"]


def model_to_json_dict(model: BaseModel, *, exclude_unset: bool = False) -> dict[str, Any]:
    return model.model_dump(
        mode="json",
        by_alias=True,
        exclude_unset=exclude_unset,
    )
