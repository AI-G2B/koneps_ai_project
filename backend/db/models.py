from sqlalchemy import String, Boolean, Numeric, Text, Date, BigInteger, ForeignKey, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from typing import Optional
from datetime import date, datetime
from .database import Base


class Notice(Base):
    __tablename__ = "notices"

    id:                   Mapped[int]            = mapped_column(primary_key=True)
    bid_ntce_no:          Mapped[str]            = mapped_column(String(40))
    bid_ntce_ord:         Mapped[str]            = mapped_column(String(10), default="00")
    notice_type:          Mapped[str]            = mapped_column(String(10))
    bid_ntce_nm:          Mapped[str]            = mapped_column(String(500))
    ntce_instt_nm:        Mapped[Optional[str]]  = mapped_column(String(200), nullable=True)
    dminstt_nm:           Mapped[Optional[str]]  = mapped_column(String(200), nullable=True)
    bid_mtd_nm:           Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    cntrct_cncls_mthd_nm: Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    is_isp_ismp:          Mapped[bool]           = mapped_column(Boolean, default=False)
    isp_ismp_type:        Mapped[Optional[str]]  = mapped_column(String(10), nullable=True)
    asign_bdgt_amt:       Mapped[Optional[float]]= mapped_column(Numeric(18, 2), nullable=True)
    presmpt_prce:         Mapped[Optional[float]]= mapped_column(Numeric(18, 2), nullable=True)
    bid_clse_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    bid_ntce_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    ntce_end_dt:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    openg_dt:             Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    exec_term_start_dt:   Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    exec_term_end_dt:     Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bid_ntce_dtl_url:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    ntce_kind_nm:         Mapped[Optional[str]]  = mapped_column(String(20), nullable=True)
    pipeline_status:      Mapped[str]            = mapped_column(String(20), default="collected")
    is_bookmarked:        Mapped[bool]           = mapped_column(Boolean, default=False)
    is_in_progress:       Mapped[bool]           = mapped_column(Boolean, default=False)
    in_progress_at:       Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sales_manager:        Mapped[Optional[str]]  = mapped_column(String(50), nullable=True)
    project_pm:           Mapped[Optional[str]]  = mapped_column(String(50), nullable=True)
    parse_error_msg:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    content_embedding:    Mapped[Optional[list]] = mapped_column(Vector(1536), nullable=True)
    collected_at:         Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    updated_at:           Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    attachments:       Mapped[list["Attachment"]]       = relationship("Attachment", back_populates="notice", cascade="all, delete-orphan")
    analysis_result:   Mapped["AnalysisResult"]         = relationship("AnalysisResult", back_populates="notice", uselist=False)
    proposal_outlines: Mapped[list["ProposalOutline"]]  = relationship("ProposalOutline", back_populates="notice")
    memo:              Mapped[Optional["NoticeMemo"]]   = relationship("NoticeMemo", back_populates="notice", uselist=False)


class Attachment(Base):
    __tablename__ = "attachments"

    id:           Mapped[int]            = mapped_column(primary_key=True)
    notice_id:    Mapped[int]            = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"))
    file_name:    Mapped[str]            = mapped_column(String(300))
    file_url:     Mapped[str]            = mapped_column(Text)
    file_type:    Mapped[str]            = mapped_column(String(20))          # pdf / hwp / doc 등
    local_path:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True) # 다운로드 후 로컬 경로
    parse_status: Mapped[str]            = mapped_column(String(20), default="pending")  # pending / done / failed
    downloaded_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    is_rfp:       Mapped[bool]           = mapped_column(Boolean, default=False)  # 제안요청서 여부

    # 변환 텍스트 캐시 — pypdf(PDF) 또는 LibreAI(HWP)로 추출. 분석/제안목차 시 재사용해 LibreAI 일 50회 한도와 재변환 부담 회피.
    converted_md:      Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    converted_at:      Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    conversion_source: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # 'pypdf' | 'libreai'

    notice: Mapped["Notice"] = relationship("Notice", back_populates="attachments")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id:                Mapped[int]            = mapped_column(primary_key=True)
    notice_id:         Mapped[int]            = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"), unique=True)

    # 정형 (대시보드 필터/집계용)
    project_type:      Mapped[Optional[str]]  = mapped_column(String(20), nullable=True)
    estimated_price:   Mapped[Optional[int]]  = mapped_column(BigInteger, nullable=True)
    allocated_budget:  Mapped[Optional[int]]  = mapped_column(BigInteger, nullable=True)
    project_duration:  Mapped[Optional[str]]  = mapped_column(String(50), nullable=True)
    contract_method:   Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    submit_deadline:   Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    risk_level:        Mapped[Optional[str]]  = mapped_column(String(10), nullable=True)

    # 텍스트 / 반정형
    issuing_org:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    project_summary:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    project_scope:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    qualification:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    eval_criteria:     Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    requirements:      Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    tech_requirements: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    poison_clauses:    Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # 메타
    raw_analysis:      Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    model_used:        Mapped[Optional[str]]  = mapped_column(String(50), nullable=True)
    prompt_version:    Mapped[Optional[str]]  = mapped_column(String(20), nullable=True)
    analysis_status:   Mapped[str]            = mapped_column(String(20), default="pending")
    analyzed_at:       Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    updated_at:        Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    notice: Mapped["Notice"] = relationship("Notice", back_populates="analysis_result")


class ProposalOutline(Base):
    __tablename__ = "proposal_outlines"

    id:                    Mapped[int]           = mapped_column(primary_key=True)
    notice_id:             Mapped[int]           = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"))
    outline_version:       Mapped[int]           = mapped_column(default=1)
    guideline_base:        Mapped[str]           = mapped_column(String(20), default="MOIS_ISP")
    total_pages_estimate:  Mapped[Optional[int]] = mapped_column(nullable=True)
    sections:              Mapped[list]          = mapped_column(JSONB, default=list)
    # RFP 원문(요구사항 섹션) — 앵커 식별 LLM + fuzzy slice로 추출한 verbatim 텍스트. 프론트·엑셀 "RFP 원문" 시트 노출용.
    rfp_raw_text:          Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_used:            Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    prompt_version:        Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    generated_at:          Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    is_active:             Mapped[bool]          = mapped_column(Boolean, default=True)

    notice:   Mapped["Notice"]               = relationship("Notice", back_populates="proposal_outlines")


class User(Base):
    __tablename__ = "users"

    id:         Mapped[int]                = mapped_column(primary_key=True)
    username:   Mapped[str]                = mapped_column(String(50), unique=True, nullable=False)
    password:   Mapped[str]                = mapped_column(String(200), nullable=False)
    name:       Mapped[str]                = mapped_column(String(50), nullable=False)
    role:       Mapped[str]                = mapped_column(String(20), nullable=False, default='manager')
    created_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    agency_settings: Mapped[list["AgencySetting"]] = relationship(
        "AgencySetting", back_populates="user", cascade="all, delete-orphan"
    )


class AgencySetting(Base):
    __tablename__ = "agency_settings"

    id:           Mapped[int]            = mapped_column(primary_key=True)
    user_id:      Mapped[int]            = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    agency_name:  Mapped[str]            = mapped_column(String(200), nullable=False)
    setting_type: Mapped[str]            = mapped_column(String(10), nullable=False)  # 'preferred' | 'avoided'
    created_at:   Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="agency_settings")


class NoticeMemo(Base):
    __tablename__ = "notice_memos"

    id:          Mapped[int]               = mapped_column(primary_key=True)
    notice_id:   Mapped[int]               = mapped_column(ForeignKey("notices.id", ondelete="CASCADE"), unique=True, nullable=False)
    content:     Mapped[str]               = mapped_column(Text, nullable=False, default="")
    author_id:   Mapped[Optional[int]]     = mapped_column(ForeignKey("users.id"), nullable=True)
    author_name: Mapped[Optional[str]]     = mapped_column(String(50), nullable=True)
    updated_at:  Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    notice: Mapped["Notice"] = relationship("Notice", back_populates="memo")
